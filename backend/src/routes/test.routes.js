import express from "express";

import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/rbac.js";

const router = express.Router();

router.get(
  "/profile",
  authenticate,
  (req, res) => {
    res.json({
      success: true,
      message: "You are authenticated",
      user: req.user,
    });
  }
);

router.get(
  "/admin",
  authenticate,
  requireRole("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin",
      user: req.user,
    });
  }
);

router.get(
  "/management",
  authenticate,
  requireRole("admin", "manager"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Management",
      user: req.user,
    });
  }
);

export default router;