const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadConfig');
const applicationController = require('../controllers/applicationController');
const { authMiddleware } = require('../middleware/authMiddleware');

// --- ROUTES CANDIDAT ---

// Postuler à une offre (Utilise le CV du profil)
router.post('/apply', authMiddleware, applicationController.applyJob);


// --- ROUTES RECRUTEUR (HR & ADMIN) ---

// Récupérer les candidatures du département (ou toutes pour l'Admin)
router.get('/my-department', authMiddleware, applicationController.getDepartmentApplications);

// Mettre à jour le statut d'une candidature (Accepté, Refusé, etc.)
router.patch('/:id/status', authMiddleware, applicationController.updateApplicationStatus);

module.exports = router;

module.exports = router;