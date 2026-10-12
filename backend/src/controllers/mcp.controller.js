import bcrypt from "bcrypt";
import User from "../models/User.js";
import { PERMISSIONS,DEFAULT_ROLE_PERMISSIONS } from "../config/permissions.js";
import { requirePermission } from "../services/permission.service.js";
import RolePermission from "../models/RolePermission.js";
import {
  getEffectivePermissions,
  updateRolePermissions,
  updateUserPermissions,
} from "../services/permission.service.js";

import {
  organizationSummary,
  membersSummary,
} from "../services/organization.service.js";

const parseUserContext = (req) => {
  const raw =
    req.headers["x-user-context"] ||
    req.body?.["x-user-context"];
  if (!raw) {
    const err = new Error("Missing x-user-context");
    err.statusCode = 401;
    throw err;
  }
  return typeof raw === "string" ? JSON.parse(raw) : raw;
};

export const listMcpMembers = async (req, res, next) => {
  try {
    const context = parseUserContext(req);
    await requirePermission(context, PERMISSIONS.MEMBER_READ);

    const filter = { organizationId: context.organizationId };
    if (context.role === "manager") {
      filter.managerId = context.userId;
    }

    const members = await User.find(filter)
      .select("-password -__v")
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      count: members.length,
      message: "Members retrieved successfully",
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const getMcpMembersByArgs = async (req, res, next) => {
  try {
    const context = parseUserContext(req);
    await requirePermission(context, PERMISSIONS.MEMBER_READ);

    const filter = { organizationId: context.organizationId };
    if (context.role === "manager") {
      filter.managerId = context.userId;
    }

    const { name, email, role } = req.query;
    if (name) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.name = { $regex: escapedName, $options: "i" };
    }
    if (email) {
      filter.email = email.toLowerCase();
    }
    if (role) {
      filter.role = role;
    }

    const members = await User.find(filter)
      .select("-password -__v")
      .sort({ createdAt: 1 })
      .lean();

    return res.json({
      success: true,
      count: members.length,
      message: "Filtered members retrieved successfully",
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const createMcpMember = async (req, res, next) => {
  try {
    const context = parseUserContext(req);
    await requirePermission(context, PERMISSIONS.MEMBER_CREATE);

    const memberData = req.body.memberData || req.body;
    const { name, email, password, role } = memberData;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    const assignedRole =
      context.role === "admin" ? role || "member" : "member";
    const assignedManagerId =
      context.role === "manager" ? context.userId : null;

    const hashedPassword = await bcrypt.hash(password, 12);

    const created = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      organizationId: context.organizationId,
      role: assignedRole,
      managerId: assignedManagerId,
    });

    return res.status(201).json({
      success: true,
      message: "Member created successfully",
      data: {
        id: created._id,
        name: created.name,
        email: created.email,
        role: created.role,
        managerId: created.managerId,
        organizationId: created.organizationId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMcpMember = async (req, res, next) => {
  try {
    const context = parseUserContext(req);
    await requirePermission(context, PERMISSIONS.MEMBER_UPDATE);

    const { memberId } = req.params;
    const memberData = req.body.memberData || req.body;

    const filter = {
      _id: memberId,
      organizationId: context.organizationId,
    };
    if (context.role === "manager") {
      filter.managerId = context.userId;
    }

    const member = await User.findOne(filter);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found or access denied",
      });
    }

    if (memberData.name) member.name = memberData.name;
    if (memberData.email) member.email = memberData.email.toLowerCase();

    await member.save();

    return res.json({
      success: true,
      message: "Member updated successfully",
      data: {
        id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        managerId: member.managerId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMcpMember = async (req, res, next) => {
  try {
    const context = parseUserContext(req);
    await requirePermission(context, PERMISSIONS.MEMBER_DELETE);

    const { memberId } = req.params;
    const filter = {
      _id: memberId,
      organizationId: context.organizationId,
    };
    if (context.role === "manager") {
      filter.managerId = context.userId;
    }

    const deleted = await User.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Member not found or access denied",
      });
    }

    return res.json({
      success: true,
      message: "Member deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getMembersSummary = async (req, res, next) => {
  try{
    const context = parseUserContext(req);

    if (context.role !== "admin" && context.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const summary = await membersSummary({ currentUser: context });

    return res.json({
      success: true,
      message: "Members summary retrieved successfully",
      data: summary,
    });
  }

  catch (error) {
    next(error);
  }
}



// GET MY EFFECTIVE PERMISSIONS
export const getMyPermissions = async (req, res, next) => {
  try {
    const userContext = req.get("x-user-context");
    if (!userContext) {
      return res.status(401).json({
        success: false,
        message: "Missing x-user-context header",
      });
    }

    const context = JSON.parse(userContext);

    const effective = await getEffectivePermissions({
      userId: context.userId,
      organizationId: context.organizationId,
      role: context.role,
    });

    return res.json({
      success: true,
      message: "Effective permissions retrieved successfully",
      role: context.role,
      data: effective,
    });
  } catch (error) {
    next(error);
  }
};

// GET ORGANIZATION ROLE PERMISSIONS (manager & member)
export const getOrganizationRolePermissions = async (req, res, next) => {
  try {
    const userContext = req.get("x-user-context");
    if (!userContext) {
      return res.status(401).json({
        success: false,
        message: "Missing x-user-context header",
      });
    }

    const context = JSON.parse(userContext);
    const role = req.params.role;

    if(context.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can access role permissions",
      });
    }

    const existing = await RolePermission.find({
      organizationId: context.organizationId,
      role: role,
    }).lean();    

    return res.json({
      success: true,
      message: "Organization role permissions retrieved successfully",
      data: existing.length > 0 ? existing[0].permissions : DEFAULT_ROLE_PERMISSIONS[role] || [],
      catalog: PERMISSIONS,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE ROLE PERMISSIONS (Admin only)
export const setOrganizationRolePermissions = async (req, res, next) => {
  try {
    const userContext = req.get("x-user-context");
    if (!userContext) {
      return res.status(401).json({
        success: false,
        message: "Missing x-user-context header",
      });
    }
    
    const context = JSON.parse(userContext);
     const role = req.params.role;
    const { permissions } = req.body;

    if(context.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update role permissions",
      });
    }
   
    const updated = await updateRolePermissions({
      organizationId: context.organizationId,
      role,
      permissions,
    });

    return res.json({
      success: true,
      message: `Permissions updated for ${role} role`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// GET SPECIFIC USER'S PERMISSIONS & OVERRIDES
export const getMemberPermissions = async (req, res, next) => {
  try {
    const userContext = req.get("x-user-context");
    const userId = req.params.userId;
    if (!userContext) {
      return res.status(401).json({
        success: false,
        message: "Missing x-user-context header",
      });
    }

    
    const context = JSON.parse(userContext);

    if(context.role !== "admin" && context.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Only admins and managers can access member permissions",
      });
    }
    
    const targetUser = await User.findOne({
      _id:  userId,
      organizationId: context.organizationId,
    }).select("-password -__v");

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in your organization",
      });
    }

    if (context.role === "manager" && targetUser.managerId?.toString() !== context.userId) {
      return res.status(403).json({
        success: false,
        message: "Managers can only view permissions for members assigned to them",
      });
    }

    const effective = await getEffectivePermissions({
      userId: targetUser._id.toString(),
      organizationId: targetUser.organizationId.toString(),
      role: targetUser.role,
    });

    return res.json({
      success: true,
      message: "User permissions retrieved successfully",
      data: effective,
      catalog: PERMISSIONS,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE SPECIFIC USER'S ALLOW / DENY OVERRIDES
export const setMemberPermissions = async (req, res, next) => {
  try {

    const userContext = req.get("x-user-context");
    const userId = req.params.userId;
    if (!userContext) {
      return res.status(401).json({
        success: false,
        message: "Missing x-user-context header",
      });
    }
    
    const context = JSON.parse(userContext);
     const { allow = [], deny = [] } = req.body;

    if(context.role !== "admin" && context.role !== "manager") {
      return res.status(403).json({
        success: false,
        message: "Only admins and managers can update member permissions",
      });
    }
    const targetUser = await User.findOne({
      _id:  userId,
      organizationId: context.organizationId,
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
      context.role === "manager" &&
      targetUser.managerId?.toString() !== context.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Managers can only update permissions for members assigned to them",
      });
    }

  

    await updateUserPermissions({
      organizationId: targetUser.organizationId,
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
      data: effective,
    });
  } catch (error) {
    next(error);
  }
};


//GET ORGANIZATION SUMMARY

export const getOrganizationSummary = async (req, res, next) => {
  try {
    const context = parseUserContext(req);

    if (context.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can access organization summary",
      });
    }

    const summary = await organizationSummary({ currentUser: context });

    return res.json({
      success: true,
      message: "Organization summary retrieved successfully",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};
