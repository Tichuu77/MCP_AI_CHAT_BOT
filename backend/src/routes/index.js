import { Router } from "express";
import authRoutes from "./auth.routes.js";
import testRoutes from "./test.routes.js";
import organizationRoutes from "./organization.routes.js";
import conversationRoutes from "./conversation.routes.js";
import chatRoutes from "./chat.routes.js";
import permissionRoutes from "./permission.routes.js";
import mcpRoutes from "./mcp.routes.js";
import artifactRoutes from "./artifact.routes.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Welcome to AI Chat MCP API",
  });
});

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "AI Chat API is running",
  });
});

router.use("/auth", authRoutes);
router.use("/test", testRoutes);
router.use("/organization", organizationRoutes);
router.use("/conversations", conversationRoutes);
router.use("/chats", chatRoutes);
router.use("/permissions", permissionRoutes);
router.use("/mcp", mcpRoutes);
router.use("/artifacts", artifactRoutes);

export default router;
