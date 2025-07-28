import express from "express";
import { adminDashboard } from "../controllers/admin.controller.js";
import { verifyAdmin } from "../middlewares/jwt.js";

const router = express.Router();

router.get("/admin-dashboard", verifyAdmin, adminDashboard);

export default router;
