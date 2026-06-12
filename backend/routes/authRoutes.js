const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authController = require('../controllers/authController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

// Configuración de Multer para fotos de perfil en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.me);
router.get('/security-config', authController.getSecurityConfig);
router.put('/profile', isAuthenticated, upload.single('foto'), authController.updateProfile);
router.delete('/profile', isAuthenticated, authController.deleteAccount);
router.get('/users', isAuthenticated, isAdmin, authController.getAllUsers);
router.put('/users/:id/vip', isAuthenticated, isAdmin, authController.makeVip);
router.put('/users/:id/remove-vip', isAuthenticated, isAdmin, authController.removeVip);
router.put('/change-password', isAuthenticated, authController.changePassword);

module.exports = router;
