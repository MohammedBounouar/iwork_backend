const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

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

module.exports = router;