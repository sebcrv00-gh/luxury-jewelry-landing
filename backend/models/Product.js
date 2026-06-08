const { pool } = require('../config/db');

const buildInternalVariantName = (index, providedName) => {
  const normalized = String(providedName || '').trim();
  return normalized || `Variante ${index + 1}`;
};

const normalizeVariants = (variants = []) => variants
  .map((variant, index) => ({
    color_nombre: buildInternalVariantName(index, variant.color_nombre),
    color_codigo: variant.color_codigo ? String(variant.color_codigo).trim() : null,
    imagen_url: variant.imagen_url || null,
    stock: Number(variant.stock || 0),
    orden: Number(variant.orden ?? index)
  }))
  .filter(variant => variant.imagen_url);

const getVariantTotalStock = (variants = []) =>
  variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);

const Product = {
  async attachVariants(products, conn = pool) {
    if (!products || products.length === 0) return products;

    const productIds = products.map(product => product.id);
    const [variantRows] = await conn.query(
      `SELECT id, producto_id, color_nombre, color_codigo, imagen_url, stock, orden
       FROM producto_variantes
       WHERE producto_id IN (?)
       ORDER BY orden ASC, id ASC`,
      [productIds]
    );

    const variantMap = new Map();
    variantRows.forEach(variant => {
      if (!variantMap.has(variant.producto_id)) {
        variantMap.set(variant.producto_id, []);
      }
      variantMap.get(variant.producto_id).push({
        id: variant.id,
        producto_id: variant.producto_id,
        color_nombre: variant.color_nombre,
        color_codigo: variant.color_codigo,
        imagen_url: variant.imagen_url,
        stock: Number(variant.stock || 0),
        orden: Number(variant.orden || 0)
      });
    });

    products.forEach(product => {
      product.stock = Number(product.stock || 0);
      product.variantes = variantMap.get(product.id) || [];
    });

    return products;
  },

  async insertVariants(conn, productId, variants = []) {
    const sanitizedVariants = normalizeVariants(variants);
    for (const variant of sanitizedVariants) {
      await conn.query(
        `INSERT INTO producto_variantes (producto_id, color_nombre, color_codigo, imagen_url, stock, orden)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          productId,
          variant.color_nombre,
          variant.color_codigo,
          variant.imagen_url,
          variant.stock,
          variant.orden
        ]
      );
    }
  },

  async syncStock(conn, productId) {
    const [variantTotals] = await conn.query(
      'SELECT COALESCE(SUM(stock), 0) AS total_stock, COUNT(*) AS total_variants FROM producto_variantes WHERE producto_id = ?',
      [productId]
    );

    if (Number(variantTotals[0]?.total_variants || 0) > 0) {
      await conn.query(
        'UPDATE productos SET stock = ? WHERE id = ?',
        [Number(variantTotals[0].total_stock || 0), productId]
      );
    }
  },

  async getAll() {
    const [rows] = await pool.query(
      'SELECT id, sku, nombre, descripcion, precio, stock, categoria, imagen_url, creado_en FROM productos WHERE stock > 0 ORDER BY creado_en DESC'
    );
    return this.attachVariants(rows);
  },

  async getHighlights(limit = 8) {
    const safeLimit = Math.max(1, Number(limit || 8));
    const [rows] = await pool.query(
      `SELECT
         p.id,
         p.sku,
         p.nombre,
         p.descripcion,
         p.precio,
         p.stock,
         p.categoria,
         p.imagen_url,
         p.creado_en,
         COALESCE(SUM(
           CASE
             WHEN o.metodo_pago = 'wompi' AND o.estado_pago = 'aprobado' THEN oi.cantidad
             WHEN o.metodo_pago = 'efectivo' AND o.estado_pago = 'aprobado' AND o.estado = 'entregado' THEN oi.cantidad
             ELSE 0
           END
         ), 0) AS total_vendido
       FROM productos p
       LEFT JOIN orden_items oi ON oi.producto_id = p.id
       LEFT JOIN ordenes o ON o.id = oi.orden_id
       WHERE p.stock > 0
       GROUP BY p.id, p.sku, p.nombre, p.descripcion, p.precio, p.stock, p.categoria, p.imagen_url, p.creado_en
       ORDER BY total_vendido DESC, p.creado_en DESC
       LIMIT ?`,
      [safeLimit]
    );
    return this.attachVariants(rows);
  },

  // Incluye productos con stock 0 para la vista de administrador
  async getAllAdmin() {
    const [rows] = await pool.query(
      'SELECT id, sku, nombre, descripcion, precio, stock, categoria, imagen_url, creado_en FROM productos ORDER BY creado_en DESC'
    );
    return this.attachVariants(rows);
  },

  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const [product] = await this.attachVariants(rows);
    return product || null;
  },

  async create(data) {
    const conn = await pool.getConnection();
    // Generar SKU automático
    try {
      await conn.beginTransaction();

      const variants = normalizeVariants(data.variantes);
      const [maxRow] = await conn.query('SELECT MAX(id) as max_id FROM productos');
      const nextId = (maxRow[0].max_id || 0) + 1;
      const prefijo = data.categoria.substring(0, 2).toUpperCase();
      const sku = prefijo + String(nextId).padStart(4, '0');
      const computedStock = variants.length > 0 ? getVariantTotalStock(variants) : Number(data.stock || 0);
      const fallbackImage = data.imagen_url || variants[0]?.imagen_url || null;

      const [result] = await conn.query(
        'INSERT INTO productos (sku, nombre, descripcion, precio, stock, categoria, imagen_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sku, data.nombre, data.descripcion, data.precio, computedStock, data.categoria, fallbackImage]
      );

      if (variants.length > 0) {
        await this.insertVariants(conn, result.insertId, variants);
      }

      await conn.commit();
      return this.getById(result.insertId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async update(id, data) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const current = await this.getById(id);
      if (!current) {
        await conn.rollback();
        return null;
      }

      const fields = [];
      const values = [];
      const variantsProvided = Object.prototype.hasOwnProperty.call(data, 'variantes');
      const variants = variantsProvided ? normalizeVariants(data.variantes) : current.variantes || [];
      const shouldManageVariants = variantsProvided && (variants.length > 0 || (current.variantes || []).length > 0);

      if (data.nombre !== undefined) { fields.push('nombre = ?'); values.push(data.nombre); }
      if (data.descripcion !== undefined) { fields.push('descripcion = ?'); values.push(data.descripcion); }
      if (data.precio !== undefined) { fields.push('precio = ?'); values.push(data.precio); }
      if (data.categoria !== undefined) { fields.push('categoria = ?'); values.push(data.categoria); }

      if (shouldManageVariants) {
        fields.push('stock = ?');
        values.push(getVariantTotalStock(variants));
      } else if (data.stock !== undefined) {
        fields.push('stock = ?');
        values.push(data.stock);
      }

      if (data.imagen_url !== undefined) {
        fields.push('imagen_url = ?');
        values.push(data.imagen_url);
      } else if (!current.imagen_url && variants.length > 0) {
        fields.push('imagen_url = ?');
        values.push(variants[0].imagen_url || null);
      }

      if (fields.length > 0) {
        values.push(id);
        await conn.query(`UPDATE productos SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      if (shouldManageVariants) {
        await conn.query('DELETE FROM producto_variantes WHERE producto_id = ?', [id]);
        if (variants.length > 0) {
          await this.insertVariants(conn, id, variants);
        }
        await this.syncStock(conn, id);
      }

      await conn.commit();
      return this.getById(id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Product;
