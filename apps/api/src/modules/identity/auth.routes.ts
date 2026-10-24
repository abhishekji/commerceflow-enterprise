import { Router } from "express";
import { authenticate, requireTrustedOrigin } from "../../middleware/auth.js";
import { getCurrentUser, login, logout, register } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", requireTrustedOrigin, register);
authRouter.post("/login", requireTrustedOrigin, login);
authRouter.post("/logout", requireTrustedOrigin, logout);
authRouter.get("/me", authenticate, getCurrentUser);
