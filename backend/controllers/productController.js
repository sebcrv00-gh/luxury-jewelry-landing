const Product = require('../models/Product');

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';
const isTruthyFlag = (value) => ['true', '1', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());

const getUploadedImagePath = (req, fieldName) => {
  const file = (req.files || []).find(entry => entry.fieldname === fieldName);
  if (file && file.buffer) {
    const base64Data = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64Data}`;
  }
  return null;
};

const buildInternalVariantName = (index, providedName) => {
  const normalized = String(providedName || '').trim();
  return normalized || `Variante ${index + 1}`;
};

const parseVariants = (req, currentVariantMap = new Map()) => {
  if (!hasValue(req.body.variantes)) return [];

  let rawVariants = req.body.variantes;
  if (typeof rawVariants === 'string') {
    rawVariants = JSON.parse(rawVariants);
  }

  if (!Array.isArray(rawVariants)) return [];

  return rawVariants
    .map((variant, index) => {
      const imageField = variant.imageField || `variante_imagen_${index}`;
      const currentVariant = variant.id ? currentVariantMap.get(Number(variant.id)) : null;
      return {
        color_nombre: buildInternalVariantName(index, variant.color_nombre || variant.colorNombre),
        color_codigo: hasValue(variant.color_codigo || variant.colorCodigo)
          ? String(variant.color_codigo || variant.colorCodigo).trim()
          : null,
        stock: Number(variant.stock || 0),
        imagen_url:
          getUploadedImagePath(req, imageField)
          || (variant.keepExistingImage ? currentVariant?.imagen_url : null)
          || variant.existingImageUrl
          || variant.imagen_url
          || null,
        orden: Number(variant.orden ?? index)
      };
    })
    .filter(variant => variant.imagen_url);
};

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

  // GET /api/products/highlights
  async getHighlights(req, res) {
    try {
      const products = await Product.getHighlights(req.query.limit);
      return res.json(products);
    } catch (err) {
      console.error('Error al obtener productos destacados:', err);
      return res.status(500).json({ error: 'Error al cargar los productos destacados' });
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
      const variantes = parseVariants(req);
      const hasVariantStock = variantes.length > 0;

      if (!hasValue(nombre) || !hasValue(precio) || !hasValue(categoria) || (!hasVariantStock && !hasValue(stock))) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      if (variantes.length > 0 && variantes.some(variant => !variant.imagen_url)) {
        return res.status(400).json({ error: 'Cada variante debe incluir una imagen identificable' });
      }

      const imagen_url = getUploadedImagePath(req, 'imagen');

      const result = await Product.create({
        nombre,
        descripcion,
        precio,
        stock,
        categoria,
        imagen_url,
        variantes
      });

      return res.json({ ok: true, id: result.id, sku: result.sku, product: result });
    } catch (err) {
      console.error('Error al crear producto:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // PUT /api/products/:id (solo admin)
  async update(req, res) {
    try {
      const { nombre, descripcion, precio, stock, categoria } = req.body;
      const currentProduct = await Product.getById(req.params.id);
      if (!currentProduct) return res.status(404).json({ error: 'Producto no encontrado' });

      const currentVariantMap = new Map(
        (currentProduct.variantes || []).map((variant) => [Number(variant.id), variant])
      );
      const data = {};
      const variantes = parseVariants(req, currentVariantMap);
      const clearVariantes = isTruthyFlag(req.body.clearVariantes);
      if (nombre !== undefined) data.nombre = nombre;
      if (descripcion !== undefined) data.descripcion = descripcion;
      if (precio !== undefined) data.precio = precio;
      if (stock !== undefined) data.stock = stock;
      if (categoria !== undefined) data.categoria = categoria;
      if (hasValue(req.body.variantes)) {
        if (variantes.some(variant => !variant.imagen_url)) {
          return res.status(400).json({ error: 'Cada variante debe incluir una imagen identificable' });
        }
        if (variantes.length === 0 && (currentProduct.variantes || []).length > 0 && !clearVariantes) {
          data.variantes = currentProduct.variantes;
        } else {
          data.variantes = variantes;
        }
      }
      const imagen_url = getUploadedImagePath(req, 'imagen');
      if (imagen_url) data.imagen_url = imagen_url;

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
