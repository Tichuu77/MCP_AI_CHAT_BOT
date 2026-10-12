import bcrypt from "bcrypt";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import UserPermission from "../models/UserPermission.js";

// GET CURRENT ORGANIZATION
export const getMyOrganization = async (req, res, next) => {
  try {
    const organization = await Organization.findById(
      req.user.organizationId
    ).select("-__v");

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const memberCount = await User.countDocuments({
      organizationId: req.user.organizationId,
    });

    return res.json({
      success: true,
      organization: {
        ...organization.toObject(),
        memberCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET ORGANIZATION MEMBERS
export const getMembers = async (req, res, next) => {
  try {
    const query = {
      organizationId: req.user.organizationId,
    };

    const members = await User.find(query)
      .select("-password -__v")
      .sort({ createdAt: 1 })
      .lean();

    const overrides = await UserPermission.find({
      organizationId: req.user.organizationId,
    }).lean();

    const overrideMap = new Map(
      overrides.map((item) => [item.userId.toString(), item])
    );

    const enrichedMembers = members.map((member) => {
      const userOverride = overrideMap.get(member._id.toString());
      return {
        ...member,
        allow: userOverride?.allow ?? [],
        deny: userOverride?.deny ?? [],
      };
    });

    return res.json({
      success: true,
      count: enrichedMembers.length,
      members: enrichedMembers,
    });
  } catch (error) {
    next(error);
  }
};

// CREATE MEMBER
export const createMember = async (req, res, next) => {
  try {
    const { name, email, password, role, managerId } = req.body;

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    // Managers can only create members under themselves
    const assignedRole =
      req.user.role === "admin" ? role || "member" : "member";
    const assignedManagerId =
      req.user.role === "manager"
        ? req.user.userId
        : assignedRole === "member" && managerId
          ? managerId
          : null;

    const hashedPassword = await bcrypt.hash(password, 12);

    const newMember = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      organizationId: req.user.organizationId,
      role: assignedRole,
      managerId: assignedManagerId,
    });

    return res.status(201).json({
      success: true,
      message: "Member created successfully",
      member: {
        _id: newMember._id,
        id: newMember._id,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        managerId: newMember.managerId,
        organizationId: newMember.organizationId,
        createdAt: newMember.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE MEMBER DETAILS
export const updateMember = async (req, res, next) => {
  try {
    const { name, email, managerId } = req.body;

    const targetUser = await User.findOne({
      _id: req.params.userId,
      organizationId: req.user.organizationId,
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in your organization",
      });
    }

    // Managers can only update members assigned to them
    if (
      req.user.role === "manager" &&
      targetUser.managerId?.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Managers can only update members assigned to them",
      });
    }

    if (email && email.toLowerCase() !== targetUser.email) {
      const emailTaken = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: targetUser._id },
      });
      if (emailTaken) {
        return res.status(409).json({
          success: false,
          message: "Email is already in use by another user",
        });
      }
      targetUser.email = email.toLowerCase();
    }

    if (name) {
      targetUser.name = name;
    }

    if (req.user.role === "admin" && managerId !== undefined) {
      targetUser.managerId = managerId || null;
    }

    await targetUser.save();

    return res.json({
      success: true,
      message: "Member updated successfully",
      member: {
        _id: targetUser._id,
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        managerId: targetUser.managerId,
        organizationId: targetUser.organizationId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE MEMBER ROLE
export const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    const targetUser = await User.findOne({
      _id: req.params.userId,
      organizationId: req.user.organizationId,
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in your organization",
      });
    }

    // Admin cannot change their own role
    if (targetUser._id.toString() === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    targetUser.role = role;
    if (role === "manager") {
      targetUser.managerId = null;
    }

    await targetUser.save();

    return res.json({
      success: true,
      message: "Member role updated successfully",
      member: {
        _id: targetUser._id,
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        managerId: targetUser.managerId,
        organizationId: targetUser.organizationId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// REMOVE MEMBER
export const removeMember = async (req, res, next) => {
  try {
    const targetUser = await User.findOne({
      _id: req.params.userId,
      organizationId: req.user.organizationId,
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in your organization",
      });
    }

    // Admin cannot remove themselves
    if (targetUser._id.toString() === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove yourself",
      });
    }

    // Managers can only remove members assigned to them
    if (
      req.user.role === "manager" &&
      targetUser.managerId?.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Managers can only remove members assigned to them",
      });
    }

    await User.deleteOne({
      _id: targetUser._id,
      organizationId: req.user.organizationId,
    });

    await UserPermission.deleteOne({
      userId: targetUser._id,
      organizationId: req.user.organizationId,
    });

    return res.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    next(error);
  }
};