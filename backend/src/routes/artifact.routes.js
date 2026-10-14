import { Router } from "express";
import authenticate from "../middleware/auth.js";
import {
  getArtifactsByConversation,
  getArtifactById,
  downloadArtifact,
} from "../controllers/artifact.controller.js";

const router = Router();

// Require authentication for all artifact routes
router.use(authenticate);

router.get("/conversation/:conversationId", getArtifactsByConversation);
router.get("/:artifactId", getArtifactById);
router.get("/:artifactId/download", downloadArtifact);

export default router;