import express from "express";
import * as userController from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadConfig.js";

const router = express.Router();

// --- AUTHENTICATION (Public) ---
router.post('/register', userController.register);
router.post('/login', userController.login);

// --- USER DATA (Protected) ---
// Returns full profile data from the database
router.get('/me', authMiddleware, userController.getMe);

// Returns basic token info (id/role) - useful for quick frontend checks
router.get('/profile', authMiddleware, (req, res) => {
    res.json({ message: "Welcome!", user: req.user });
}); 
router.put('/update-profile', authMiddleware, userController.updateMyProfile);

// Route pour créer un HR
router.post('/create-hr', authMiddleware, userController.createHR);
router.put('/update-hr/:id', authMiddleware, userController.updateHR);
router.delete('/delete-hr/:id', authMiddleware, userController.deleteHR);
router.get('/my-hr', authMiddleware, userController.getAllHRByAdmin);

// Route pour uploader ou mettre à jour le CV du profil
router.post('/upload-cv', authMiddleware, upload.single('document'), userController.uploadProfileCV);
router.delete('/delete-cv', authMiddleware, userController.deleteProfileCV);

export default router;