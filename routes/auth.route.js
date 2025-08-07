import express from "express";
import {
  login,
  logout,
  register,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { createRateLimiter } from "../utils/rateLimiter.js";
import upload from "../middlewares/multer.js";

const router = express.Router();

const registerLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  "Too many registrations, try again later."
);
const loginLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  "Too many login attempts, try again later."
);
const forgotLimiter = createRateLimiter(
  15 * 60 * 1000,
  3,
  "Too many password reset requests, try again later."
);
const resetPasswordLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  "Too many password reset attempts."
);

router.post("/register", registerLimiter, upload.single("avatar"), register); 
router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.post("/forgot-password", forgotLimiter, forgotPassword);
router.post("/reset-password/:token", resetPasswordLimiter, resetPassword);

export default router;
