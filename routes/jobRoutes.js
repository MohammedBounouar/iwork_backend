import express from "express";
const router = express.Router();
import * as jobController from '../controllers/jobController.js';
import  { authMiddleware } from '../middleware/authMiddleware.js';


router.get('/', jobController.getAllOffers);

// 🔐 Protected route
router.get('/job/:companyId', jobController.getOffersByCompany);
router.get('/job/grouped-by-author/:companyId', authMiddleware, jobController.getOffersGroupedByAuthor);
// Create offer (Admin HR)
router.post('/', authMiddleware, jobController.createOffer);
router.delete('/delete/:id', authMiddleware, jobController.deleteOffer);


export default router;