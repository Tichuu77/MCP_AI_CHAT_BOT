import { Router } from "express";
import authenticate from "../middleware/auth.js";
import requireRole, { checkPermission } from "../middleware/rbac.js";
import validate from "../middleware/validate.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";
import {
  getMyPermissions,
  getOrganizationRolePermissions,
  setOrganizationRolePermissions,
  getMemberPermissions,
  setMemberPermissions,
} from "../controllers/permission.controller.js";
import {
  updateRolePermissionsSchema,
  updateUserPermissionsSchema,
} from "../validations/permission.validation.js";

const router = Router();

router.get("/me", authenticate, getMyPermissions);

router.get(
  "/roles",
  authenticate,
  checkPermission(PERMISSIONS.MEMBER_READ),
  getOrganizationRolePermissions
);

router.put(
  "/roles/:role",
  authenticate,
  requireRole("admin"),
  validate(updateRolePermissionsSchema),
  setOrganizationRolePermissions
);

router.get(
  "/users/:userId",
  authenticate,
  checkPermission(PERMISSIONS.MEMBER_READ),
  getMemberPermissions
);

router.put(
  "/users/:userId",
  authenticate,
  checkPermission(PERMISSIONS.MEMBER_UPDATE),
  validate(updateUserPermissionsSchema),
  setMemberPermissions
);

export default router;
