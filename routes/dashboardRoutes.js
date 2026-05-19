import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET DASHBOARD STATS
 * HR / ADMIN
 */
router.get("/stats", authMiddleware, getDashboardStats);

export default router;