import { Router } from "express";
import authenticate from "../middleware/auth.js";
import { checkPermission } from "../middleware/rbac.js";
import validate from "../middleware/validate.middleware.js";
import { PERMISSIONS } from "../config/permissions.js";
import {
  createConversation,
  getMyConversations,
  getConversation,
  updateConversation,
  deleteConversation,
} from "../controllers/conversation.controller.js";
import {
  createConversationSchema,
  updateConversationSchema,
} from "../validations/conversation.validation.js";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.CONVERSATION_CREATE),
  validate(createConversationSchema),
  createConversation
);

router.get(
  "/",
  authenticate,
  checkPermission(PERMISSIONS.CONVERSATION_READ),
  getMyConversations
);

router.get(
  "/:conversationId",
  authenticate,
  checkPermission(PERMISSIONS.CONVERSATION_READ),
  getConversation
);

router.patch(
  "/:conversationId",
  authenticate,
  checkPermission(PERMISSIONS.CONVERSATION_UPDATE),
  validate(updateConversationSchema),
  updateConversation
);

router.delete(
  "/:conversationId",
  authenticate,
  checkPermission(PERMISSIONS.CONVERSATION_DELETE),
  deleteConversation
);

export default router;