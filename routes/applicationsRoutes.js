const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadConfig');
const applicationController = require('../controllers/applicationController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Postuler à une offre
router.post('/apply', authMiddleware, applicationController.applyJob);

module.exports = router;