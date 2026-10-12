import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Organization from "../models/Organization.js";
import RolePermission from "../models/RolePermission.js";
import { DEFAULT_ROLE_PERMISSIONS } from "../config/permissions.js";
import { getEffectivePermissions } from "../services/permission.service.js";

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user.userId,
      organizationId: user.organizationId.toString(),
      role: user.role,
      name: user.name,
      organizationName: user.organizationName || null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, organizationName } = req.body;

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const organization = await Organization.create({
      name: organizationName,
      ownerId: null,
    });

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      organizationId: organization._id,
      role: "admin",
    });

    organization.ownerId = user._id;
    await organization.save();

    // Seed default role permissions for the organization
    await RolePermission.insertMany([
      {
        organizationId: organization._id,
        role: "manager",
        permissions: DEFAULT_ROLE_PERMISSIONS.manager,
      },
      {
        organizationId: organization._id,
        role: "member",
        permissions: DEFAULT_ROLE_PERMISSIONS.member,
      },
    ]).catch(() => {});

    const effective = await getEffectivePermissions({
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
    });

    const token = createToken({
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
      name: user.name,
      organizationName: organization.name,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        organizationName: organization.name,
        permissions: effective.permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const organization = await Organization.findById(user.organizationId);

    const effective = await getEffectivePermissions({
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
    });

    const token = createToken({
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
      name: user.name,
      organizationName: organization?.name || null,
    });

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        managerId: user.managerId || null,
        organizationName: organization?.name || null,
        permissions: effective.permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("-password -__v");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const organization = await Organization.findById(user.organizationId).select(
      "-__v"
    );

    const effective = await getEffectivePermissions({
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
    });

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        managerId: user.managerId || null,
        organizationName: organization?.name || null,
        permissions: effective.permissions,
      },
      effectivePermissions: effective,
    });
  } catch (error) {
    next(error);
  }
};