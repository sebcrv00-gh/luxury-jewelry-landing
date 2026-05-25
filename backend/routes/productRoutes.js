const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const productController = require('../controllers/productController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Configuración de Multer para imágenes de productos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '_producto' + ext);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten archivos de imagen'));
    }
    cb(null, true);
  }
});

router.get('/', productController.getAll);
router.get('/admin/all', isAuthenticated, isAdmin, productController.getAllAdmin);
router.get('/:id', productController.getById);
router.post('/', isAuthenticated, isAdmin, upload.any(), productController.create);
router.put('/:id', isAuthenticated, isAdmin, upload.any(), productController.update);
router.delete('/:id', isAuthenticated, isAdmin, productController.delete);

module.exports = router;
