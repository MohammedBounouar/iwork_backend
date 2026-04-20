const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authMiddleware } = require('../middleware/authMiddleware');


// Create offer (Admin HR)
router.post('/', authMiddleware, jobController.createOffer);


module.exports = router;