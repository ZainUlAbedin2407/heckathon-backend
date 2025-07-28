import express from "express";
import { verifyAdmin, verifyToken } from "../middlewares/jwt.js";
import {
  deleteUser,
  getAllUsers,
  getUser,
  updateUser,
  changePassword,
} from "../controllers/user.controller.js";
import { createRateLimiter } from "../utils/rateLimiter.js";

const router = express.Router();

const changePasswordLimiter = createRateLimiter(
  10 * 60 * 1000,
  5,
  "Too many password change attempts."
);

router.get("/", verifyAdmin, getAllUsers);
router.get("/:id", verifyToken, getUser);
router.put("/:id", verifyToken, updateUser);
router.delete("/:id", verifyToken, deleteUser);
router.patch(
  "/change-password",
  verifyToken,
  changePasswordLimiter,
  changePassword
);

export default router;
