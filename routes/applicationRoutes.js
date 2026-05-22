import express from "express";
const router = express.Router();
import upload from "../middleware/uploadConfig.js";
import * as applicationsController from "../controllers/applicationsController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

// --- ROUTES CANDIDAT ---

// Postuler à une offre (Utilise le CV du profil)
router.post('/apply/:jobId', authMiddleware, applicationsController.applyJob);


// --- ROUTES RECRUTEUR (HR & ADMIN) ---

// Récupérer les candidatures du département (ou toutes pour l'Admin)
router.get('/my-department', authMiddleware, applicationsController.getDepartmentApplications);

// Mettre à jour le statut d'une candidature (Accepté, Refusé, etc.)
router.patch('/:id/status', authMiddleware, applicationsController.updateApplicationStatus);

export default router;
