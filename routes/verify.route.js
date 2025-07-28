import express from "express";
import { verifyEmail } from "../controllers/verify.controller.js";
import { resendCode } from "../controllers/verify.controller.js";
import { createRateLimiter } from "../utils/rateLimiter.js";

const router = express.Router();

const verifyEmailLimiter = createRateLimiter(
  15 * 60 * 1000,
  3,
  "Too many email verification attempts."
);

router.post("/", verifyEmailLimiter, verifyEmail);
router.post("/resend", verifyEmailLimiter, resendCode);

export default router;
