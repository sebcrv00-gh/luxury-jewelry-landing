const { pool } = require('../config/db');

const Product = {
  async getAll() {
    const [rows] = await pool.query(
      'SELECT id, sku, nombre, descripcion, precio, stock, categoria, imagen_url FROM productos WHERE stock > 0 ORDER BY creado_en DESC'
    );
    return rows;
  },

  // Incluye productos con stock 0 para la vista de administrador
  async getAllAdmin() {
    const [rows] = await pool.query(
      'SELECT id, sku, nombre, descripcion, precio, stock, categoria, imagen_url FROM productos ORDER BY creado_en DESC'
    );
    return rows;
  },

  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(data) {
    // Generar SKU automático
    const [maxRow] = await pool.query('SELECT MAX(id) as max_id FROM productos');
    const nextId = (maxRow[0].max_id || 0) + 1;
    const prefijo = data.categoria.substring(0, 2).toUpperCase();
    const sku = prefijo + String(nextId).padStart(4, '0');

    const [result] = await pool.query(
      'INSERT INTO productos (sku, nombre, descripcion, precio, stock, categoria, imagen_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sku, data.nombre, data.descripcion, data.precio, data.stock, data.categoria, data.imagen_url]
    );
    return { id: result.insertId, sku };
  },

  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.nombre !== undefined) { fields.push('nombre = ?'); values.push(data.nombre); }
    if (data.descripcion !== undefined) { fields.push('descripcion = ?'); values.push(data.descripcion); }
    if (data.precio !== undefined) { fields.push('precio = ?'); values.push(data.precio); }
    if (data.stock !== undefined) { fields.push('stock = ?'); values.push(data.stock); }
    if (data.categoria !== undefined) { fields.push('categoria = ?'); values.push(data.categoria); }
    if (data.imagen_url !== undefined) { fields.push('imagen_url = ?'); values.push(data.imagen_url); }

    if (fields.length === 0) return null;

    values.push(id);
    await pool.query(`UPDATE productos SET ${fields.join(', ')} WHERE id = ?`, values);

    return this.getById(id);
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Product;
