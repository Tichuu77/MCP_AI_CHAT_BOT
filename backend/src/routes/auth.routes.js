import { Router } from "express";
import authenticate from "../middleware/auth.js";
import validate from "../middleware/validate.middleware.js";
import { register, login, getMe } from "../controllers/auth.controller.js";
import { registerSchema, loginSchema } from "../validations/auth.validation.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", authenticate, getMe);

export default router;