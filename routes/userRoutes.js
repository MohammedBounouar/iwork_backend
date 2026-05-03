const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadConfig');


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

// Route pour créer un HR
router.post('/create-hr', authMiddleware, userController.createHR);

// Route pour uploader ou mettre à jour le CV du profil
router.post('/upload-cv', authMiddleware, upload.single('cv'), userController.uploadProfileCV);

module.exports = router;