import RolePermission from "../models/RolePermission.js";
import UserPermission from "../models/UserPermission.js";
import {
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from "../config/permissions.js";

export const getEffectivePermissions = async ({
  userId,
  organizationId,
  role,
}) => {
  // Admin has full access
  if (role === "admin") {
    return {
      isAdmin: true,
      permissions: Object.values(PERMISSIONS),
      wildcard: true,
    };
  }

  // Get default permissions for the user's role in this organization
  const rolePermission = await RolePermission.findOne({
    organizationId,
    role,
  }).lean();

  // Get user-specific overrides
  const userPermission = await UserPermission.findOne({
    userId,
    organizationId,
  }).lean();

  const rolePermissions =
    rolePermission?.permissions ?? DEFAULT_ROLE_PERMISSIONS[role] ?? [];

  const userAllowedPermissions = userPermission?.allow ?? [];
  const userDeniedPermissions = userPermission?.deny ?? [];

  // Start with role permissions
  const effectivePermissions = new Set(rolePermissions);

  // Add user-specific allowed permissions
  for (const permission of userAllowedPermissions) {
    effectivePermissions.add(permission);
  }

  // Deny always wins
  for (const permission of userDeniedPermissions) {
    effectivePermissions.delete(permission);
  }

  return {
    isAdmin: false,
    permissions: [...effectivePermissions],
    rolePermissions,
    allow: userAllowedPermissions,
    deny: userDeniedPermissions,
  };
};

export const hasPermission = async (context, permission) => {
  const result = await getEffectivePermissions(context);

  if (result.isAdmin) {
    return true;
  }

  return result.permissions.includes(permission);
};

export const requirePermission = async (context, permission) => {
  const allowed = await hasPermission(context, permission);

  if (!allowed) {
    const error = new Error(`Permission denied: ${permission}`);
    error.statusCode = 403;
    throw error;
  }

  return true;
};

export const updateRolePermissions = async ({
  organizationId,
  role,
  permissions,
}) => {
  const validPermissions = new Set(Object.values(PERMISSIONS));

  const invalidPermissions = permissions.filter(
    (permission) => !validPermissions.has(permission)
  );

  if (invalidPermissions.length > 0) {
    const error = new Error(
      `Invalid permissions: ${invalidPermissions.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  const updated = await RolePermission.findOneAndUpdate(
    {
      organizationId,
      role,
    },
    {
      $set: {
        permissions: [...new Set(permissions)],
      },
    },
    {
      new: true,
      upsert: true,
    }
  ).lean();

  return updated;
};

export const updateUserPermissions = async ({
  organizationId,
  userId,
  allow = [],
  deny = [],
}) => {
  const validPermissions = new Set(Object.values(PERMISSIONS));

  const allProvided = [...allow, ...deny];
  const invalidPermissions = allProvided.filter(
    (permission) => !validPermissions.has(permission)
  );

  if (invalidPermissions.length > 0) {
    const error = new Error(
      `Invalid permissions: ${invalidPermissions.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }

  const cleanAllow = [...new Set(allow)];
  const cleanDeny = [...new Set(deny)];

  const updated = await UserPermission.findOneAndUpdate(
    {
      userId,
      organizationId,
    },
    {
      $set: {
        allow: cleanAllow,
        deny: cleanDeny,
      },
    },
    {
      new: true,
      upsert: true,
    }
  ).lean();

  return updated;
};