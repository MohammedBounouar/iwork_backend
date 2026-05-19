import express from "express";
const router = express.Router();
import * as categoryController from "../controllers/categoryController.js";

// Returns all categories
router.get('/allCategories', categoryController.getAllCategories);

export default router;