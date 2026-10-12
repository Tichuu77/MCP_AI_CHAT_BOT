import RolePermission from "../models/RolePermission.js";
import User from "../models/User.js";
import {
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from "../config/permissions.js";
import {
  getEffectivePermissions,
  updateRolePermissions,
  updateUserPermissions,
} from "../services/permission.service.js";

// GET MY EFFECTIVE PERMISSIONS
export const getMyPermissions = async (req, res, next) => {
  try {
    const effective = await getEffectivePermissions({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      role: req.user.role,
    });

    return res.json({
      success: true,
      role: req.user.role,
      ...effective,
      catalog: PERMISSIONS,
    });
  } catch (error) {
    next(error);
  }
};

// GET ORGANIZATION ROLE PERMISSIONS (manager & member)
export const getOrganizationRolePermissions = async (req, res, next) => {
  try {
    const existing = await RolePermission.find({
      organizationId: req.user.organizationId,
    }).lean();

    const byRole = new Map(existing.map((item) => [item.role, item.permissions]));

    return res.json({
      success: true,
      roles: {
        admin: Object.values(PERMISSIONS),
        manager: byRole.get("manager") ?? DEFAULT_ROLE_PERMISSIONS.manager,
        member: byRole.get("member") ?? DEFAULT_ROLE_PERMISSIONS.member,
      },
      catalog: PERMISSIONS,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE ROLE PERMISSIONS (Admin only)
export const setOrganizationRolePermissions = async (req, res, next) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (!["manager", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be either manager or admin",
      });
    }

    const updated = await updateRolePermissions({
      organizationId: req.user.organizationId,
      role,
      permissions,
    });

    return res.json({
      success: true,
      message: `Permissions updated for ${role} role`,
      rolePermission: updated,
    });
  } catch (error) {
    next(error);
  }
};

// GET SPECIFIC USER'S PERMISSIONS & OVERRIDES
export const getMemberPermissions = async (req, res, next) => {
  try {
    const targetUser = await User.findOne({
      _id: req.params.userId,
      organizationId: req.user.organizationId,
    }).select("-password -__v");

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in your organization",
      });
    }

    const effective = await getEffectivePermissions({
      userId: targetUser._id.toString(),
      organizationId: targetUser.organizationId.toString(),
      role: targetUser.role,
    });

    return res.json({
      success: true,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        managerId: targetUser.managerId,
      },
      ...effective,
      catalog: PERMISSIONS,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE SPECIFIC USER'S ALLOW / DENY OVERRIDES
export const setMemberPermissions = async (req, res, next) => {
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

    if (targetUser.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin permissions cannot be overridden",
      });
    }

    // Managers can only modify overrides for members under themselves
    if (
      req.user.role === "manager" &&
      targetUser.managerId?.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Managers can only update permissions for members assigned to them",
      });
    }

    const { allow = [], deny = [] } = req.body;

    await updateUserPermissions({
      organizationId: req.user.organizationId,
      userId: targetUser._id,
      allow,
      deny,
    });

    const effective = await getEffectivePermissions({
      userId: targetUser._id.toString(),
      organizationId: targetUser.organizationId.toString(),
      role: targetUser.role,
    });

    return res.json({
      success: true,
      message: "User permission overrides updated successfully",
      ...effective,
    });
  } catch (error) {
    next(error);
  }
};
