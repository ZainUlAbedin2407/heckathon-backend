import express from "express";
import { verifyToken } from "../middlewares/jwt.js";
import upload from "../middlewares/multer.js";
import {
  uploadMedicalReport,
  getUserMedicalReports,
  getMedicalReport,
  updateMedicalReport,
  deleteMedicalReport,
  getMedicalReportStats,
  reprocessMedicalReport,
  getAIProcessingStatus
} from "../controllers/medicalReport.controller.js";
import { createRateLimiter } from "../utils/rateLimiter.js";

const router = express.Router();

// Rate limiters
const uploadLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  5, // 5 uploads per minute
  "Too many upload attempts. Please try again later."
);

const apiLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  30, // 30 requests per minute
  "Too many requests. Please try again later."
);

// All routes require authentication
router.use(verifyToken);

// Upload medical report
router.post(
  "/upload",
  uploadLimiter,
  upload.single("medicalReport"),
  uploadMedicalReport
);

// Get all medical reports for user with filters
router.get("/", apiLimiter, getUserMedicalReports);

// Get medical report statistics
router.get("/stats", apiLimiter, getMedicalReportStats);

// Get single medical report
router.get("/:id", apiLimiter, getMedicalReport);

// Get AI processing status
router.get("/:id/ai-status", apiLimiter, getAIProcessingStatus);

// Update medical report
router.put("/:id", apiLimiter, updateMedicalReport);

// Delete medical report
router.delete("/:id", apiLimiter, deleteMedicalReport);

// Reprocess medical report with AI
router.post("/:id/reprocess", apiLimiter, reprocessMedicalReport);

export default router;
