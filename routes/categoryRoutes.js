const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Returns all categories
router.get('/allCategories', categoryController.getAllCategories);

module.exports = router;