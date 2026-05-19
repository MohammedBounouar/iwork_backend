import express from "express";
const router = express.Router();

import * as companyController from "../controllers/companyController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import upload from "../config/multerConfig.js";

/**
 * CHECK IF USER HAS COMPANY
 * GET /api/companies/check
 */
router.get("/check", authMiddleware, companyController.checkCompany);

/**
 * CREATE COMPANY (ADMIN ONLY)
 * POST /api/companies
 */
router.post(
  "/",
  authMiddleware,
  upload.single("logo"),
  companyController.createCompany
);

/**
 * SEARCH COMPANY BY NAME
 * GET /api/companies/search/:name
 */
router.get("/search/:name", companyController.searchCompany);

router.get("/my-company", authMiddleware , companyController . getMyCompany);
router.put("/", authMiddleware , upload.single("logo") , companyController . updateCompany);

export default router;