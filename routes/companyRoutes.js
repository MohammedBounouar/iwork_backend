const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authMiddleware } = require('../middleware/authMiddleware');

const upload = require('../config/multerConfig');

// Create company (Admin only)

router.post('/', authMiddleware, upload.single('logo'), companyController.createCompany);

// Get company details (Public - for candidates to see who is hiring)
// router.get('/:id', companyController.getCompanyById);
// The :name here must match req.params.name in the controller
router.get('/search/:name', companyController.searchCompany);

module.exports = router;