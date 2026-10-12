import { hasPermission } from "../services/permission.service.js";

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

export const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const allowed = await hasPermission(req.user, permission);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Missing required permission: ${permission}`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default requireRole;