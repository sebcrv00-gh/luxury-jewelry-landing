const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const productController = require('../controllers/productController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Configuración de Multer para imágenes de productos en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten archivos de imagen'));
    }
    cb(null, true);
  }
});

const handleProductUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FIELD_VALUE') {
        return res.status(400).json({ error: 'Uno de los campos enviados es demasiado grande para procesarse.' });
      }
      return res.status(400).json({ error: err.message || 'Error al procesar los archivos del producto.' });
    }

    return res.status(400).json({ error: err.message || 'Error al cargar archivos del producto.' });
  });
};

router.get('/', productController.getAll);
router.get('/highlights', productController.getHighlights);
router.get('/admin/all', isAuthenticated, isAdmin, productController.getAllAdmin);
router.get('/:id', productController.getById);
router.post('/', isAuthenticated, isAdmin, handleProductUpload, productController.create);
router.put('/:id', isAuthenticated, isAdmin, handleProductUpload, productController.update);
router.delete('/:id', isAuthenticated, isAdmin, productController.delete);

module.exports = router;
