const Product = require('../models/Product');

const productController = {
  // GET /api/products
  async getAll(req, res) {
    try {
      const products = await Product.getAll();
      return res.json(products);
    } catch (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ error: 'Error al cargar los productos' });
    }
  },

  // GET /api/products/:id
  async getById(req, res) {
    try {
      const product = await Product.getById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
      return res.json(product);
    } catch (err) {
      console.error('Error al obtener producto:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // POST /api/products (solo admin)
  async create(req, res) {
    try {
      const { nombre, descripcion, precio, stock, categoria } = req.body;
      if (!nombre || !precio || !stock || !categoria) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      let imagen_url = null;
      if (req.file) {
        imagen_url = 'uploads/' + req.file.filename;
      }

      const result = await Product.create({
        nombre, descripcion, precio, stock, categoria, imagen_url
      });

      return res.json({ ok: true, id: result.id, sku: result.sku });
    } catch (err) {
      console.error('Error al crear producto:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  }
};

module.exports = productController;
