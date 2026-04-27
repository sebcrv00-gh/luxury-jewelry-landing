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
const upload = multer({ storage });

router.get('/', productController.getAll);
router.get('/admin/all', isAuthenticated, isAdmin, productController.getAllAdmin);
router.get('/:id', productController.getById);
router.post('/', isAuthenticated, isAdmin, upload.single('imagen'), productController.create);
router.put('/:id', isAuthenticated, isAdmin, upload.single('imagen'), productController.update);
router.delete('/:id', isAuthenticated, isAdmin, productController.delete);

module.exports = router;
