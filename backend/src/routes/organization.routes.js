import { Router } from "express";
import authenticate from "../middleware/auth.js";
import requireRole, { checkPermission } from "../middleware/rbac.js";
import validate from "../middleware/validate.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";
import {
  getMyOrganization,
  getMembers,
  createMember,
  updateMember,
  updateMemberRole,
  removeMember,
} from "../controllers/organization.controller.js";
import {
  createMemberSchema,
  updateMemberSchema,
  updateMemberRoleSchema,
} from "../validations/organization.validation.js";

const router = Router();

router.get(
  "/me",
  authenticate,
  checkPermission(PERMISSIONS.ORGANIZATION_READ),
  getMyOrganization
);

router.get(
  "/members",
  authenticate,
  checkPermission(PERMISSIONS.MEMBER_READ),
  getMembers
);

router.post(
  "/members",
  authenticate,
  checkPermission(PERMISSIONS.MEMBER_CREATE),
  validate(createMemberSchema),
  createMember
);

router.patch(
  "/members/:userId",
  authenticate,
  checkPermission(PERMISSIONS.MEMBER_UPDATE),
  validate(updateMemberSchema),
  updateMember
);

router.patch(
  "/members/:userId/role",
  authenticate,
  requireRole("admin"),
  validate(updateMemberRoleSchema),
  updateMemberRole
);

router.delete(
  "/members/:userId",
  authenticate,
  checkPermission(PERMISSIONS.MEMBER_DELETE),
  removeMember
);

export default router;