import { Router } from "express";
import authenticate from "../middleware/auth.js";
import validate from "../middleware/validate.middleware.js";
import {
  mcpTest,
  aiMcpTest,
  sendMessage,
} from "../controllers/chat.controller.js";
import { sendMessageSchema } from "../validations/chat.validation.js";

const router = Router();

router.get("/mcp-test", authenticate, mcpTest);
router.get("/ai-mcp-test", authenticate, aiMcpTest);
router.post(
  "/:conversationId",
  authenticate,
  validate(sendMessageSchema),
  sendMessage
);

export default router;