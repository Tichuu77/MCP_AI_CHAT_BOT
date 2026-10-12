import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Organization from "../models/Organization.js";
import RolePermission from "../models/RolePermission.js";
import { DEFAULT_ROLE_PERMISSIONS } from "../config/permissions.js";

const createToken = ({
  userId,
  organizationId,
  role,
  name,
  organizationName,
}) => {
  return jwt.sign(
    {
      userId,
      organizationId,
      role,
      name,
      organizationName: organizationName || null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

export const registerUser = async ({
  name,
  email,
  password,
  organizationName,
}) => {
  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    const error = new Error("User already exists");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(
    password,
    12
  );

  const organization = await Organization.create({
    name: organizationName,
    ownerId: null,
  });

  const user = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    organizationId: organization._id,
    role: "admin",
  });

  organization.ownerId = user._id;
  await organization.save();

  // Create default role permissions
  await RolePermission.insertMany([
    {
      organizationId: organization._id,
      role: "manager",
      permissions:
        DEFAULT_ROLE_PERMISSIONS.manager,
    },
    {
      organizationId: organization._id,
      role: "member",
      permissions:
        DEFAULT_ROLE_PERMISSIONS.member,
    },
  ]);

  const token = createToken({
    userId: user._id.toString(),
    organizationId:
      user.organizationId.toString(),
    role: user.role,
    name: user.name,
    organizationName: organization.name,
  });

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      organizationName: organization.name,
    },
  };
};

export const loginUser = async ({
  email,
  password,
}) => {
  const normalizedEmail = email.toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (!user) {
    const error = new Error(
      "Invalid email or password"
    );
    error.statusCode = 401;
    throw error;
  }

  const passwordMatch = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatch) {
    const error = new Error(
      "Invalid email or password"
    );
    error.statusCode = 401;
    throw error;
  }

  const organization = await Organization.findById(
    user.organizationId
  );

  const token = createToken({
    userId: user._id.toString(),
    organizationId: user.organizationId.toString(),
    role: user.role,
    name: user.name,
    organizationName: organization?.name || null,
  });

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
      organizationName: organization?.name || null,
    },
  };
};