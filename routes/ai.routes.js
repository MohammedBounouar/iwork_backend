// src/routes/ai.routes.js
import express from "express";
import { chatAssistant } from "../controllers/Ai_Services/aiController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/chat", authMiddleware, chatAssistant); 

export default router;