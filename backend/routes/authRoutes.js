const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

// Configuración de Multer para fotos de perfil
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '_perfil' + ext);
  }
});
const upload = multer({ storage });

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.me);
router.put('/profile', isAuthenticated, upload.single('foto'), authController.updateProfile);
router.delete('/profile', isAuthenticated, authController.deleteAccount);

module.exports = router;
