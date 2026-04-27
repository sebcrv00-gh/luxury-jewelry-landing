const { pool } = require('../config/db');

const Wishlist = {
  async add(userId, productId) {
    const [result] = await pool.query(
      'INSERT IGNORE INTO wishlist (usuario_id, producto_id) VALUES (?, ?)',
      [userId, productId]
    );
    return result.affectedRows > 0;
  },

  async remove(userId, productId) {
    const [result] = await pool.query(
      'DELETE FROM wishlist WHERE usuario_id = ? AND producto_id = ?',
      [userId, productId]
    );
    return result.affectedRows > 0;
  },

  async getByUser(userId) {
    const [rows] = await pool.query(`
      SELECT w.id, w.creado_en, p.id as producto_id, p.nombre, p.precio, p.stock, p.imagen_url, p.categoria
      FROM wishlist w 
      JOIN productos p ON w.producto_id = p.id 
      WHERE w.usuario_id = ? 
      ORDER BY w.creado_en DESC
    `, [userId]);
    return rows;
  },

  async isInWishlist(userId, productId) {
    const [rows] = await pool.query(
      'SELECT id FROM wishlist WHERE usuario_id = ? AND producto_id = ?',
      [userId, productId]
    );
    return rows.length > 0;
  }
};

module.exports = Wishlist;
