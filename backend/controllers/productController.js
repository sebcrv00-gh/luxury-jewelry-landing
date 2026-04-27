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

  // GET /api/products/admin/all  (incluye stock 0)
  async getAllAdmin(req, res) {
    try {
      const products = await Product.getAllAdmin();
      return res.json(products);
    } catch (err) {
      console.error('Error al obtener productos (admin):', err);
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
  },

  // PUT /api/products/:id (solo admin)
  async update(req, res) {
    try {
      const { nombre, descripcion, precio, stock, categoria } = req.body;
      const data = {};
      if (nombre !== undefined) data.nombre = nombre;
      if (descripcion !== undefined) data.descripcion = descripcion;
      if (precio !== undefined) data.precio = precio;
      if (stock !== undefined) data.stock = stock;
      if (categoria !== undefined) data.categoria = categoria;
      if (req.file) data.imagen_url = 'uploads/' + req.file.filename;

      const updated = await Product.update(req.params.id, data);
      if (!updated) return res.status(404).json({ error: 'Producto no encontrado o sin cambios' });

      return res.json({ ok: true, product: updated });
    } catch (err) {
      console.error('Error al actualizar producto:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // DELETE /api/products/:id (solo admin)
  async delete(req, res) {
    try {
      const deleted = await Product.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Producto no encontrado' });
      return res.json({ ok: true, message: 'Producto eliminado correctamente' });
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  }
};

module.exports = productController;

