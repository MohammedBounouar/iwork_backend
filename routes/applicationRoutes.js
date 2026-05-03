const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadConfig');
const applicationsController = require('../controllers/applicationsController');
const { authMiddleware } = require('../middleware/authMiddleware');

// --- ROUTES CANDIDAT ---

// Postuler à une offre (Utilise le CV du profil)
router.post('/apply', authMiddleware, applicationsController.applyJob);


// --- ROUTES RECRUTEUR (HR & ADMIN) ---

// Récupérer les candidatures du département (ou toutes pour l'Admin)
router.get('/my-department', authMiddleware, applicationsController.getDepartmentApplications);

// Mettre à jour le statut d'une candidature (Accepté, Refusé, etc.)
router.patch('/:id/status', authMiddleware, applicationsController.updateApplicationStatus);

module.exports = router;

module.exports = router;