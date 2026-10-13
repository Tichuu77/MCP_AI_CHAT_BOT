import { Router } from "express";
import {
  listMcpMembers,
  getMcpMembersByArgs,
  createMcpMember,
  updateMcpMember,
  deleteMcpMember,
  getOrganizationRolePermissions,
  setOrganizationRolePermissions,
  getMemberPermissions,
  setMemberPermissions,
  getMyPermissions,
  getOrganizationSummary,
  getMembersSummary,
  runCode
} from "../controllers/mcp.controller.js";

const router = Router();

// Verify that requests come from the MCP server, not external clients
router.use((req, res, next) => {
  const secret = req.headers["x-internal-secret"];
  if (!process.env.MCP_INTERNAL_SECRET || secret !== process.env.MCP_INTERNAL_SECRET) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized — invalid internal secret",
    });
  }
  next();
});

router.get("/members", listMcpMembers);
router.get("/members/get", getMcpMembersByArgs);
router.get("/members/summary", getMembersSummary);
router.post("/members", createMcpMember);
router.put("/members/:memberId", updateMcpMember);
router.delete("/members/:memberId", deleteMcpMember);

router.get("/permissions/me", getMyPermissions);
router.get("/permissions/organization/:role", getOrganizationRolePermissions);
router.put("/permissions/organization/:role", setOrganizationRolePermissions);
router.get("/permissions/organization/members/:userId", getMemberPermissions);
router.put("/permissions/organization/members/:userId", setMemberPermissions);

router.get("/organization/summary", getOrganizationSummary);

// RUN CODE IN SANDBOX
router.post("/sandbox/run-code", runCode);


export default router;