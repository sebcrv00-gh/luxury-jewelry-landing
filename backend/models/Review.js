const { pool } = require('../config/db');

const Review = {
  async getEligibleByUser(userId) {
    const [rows] = await pool.query(
      `SELECT
         oi.id AS order_item_id,
         oi.orden_id,
         oi.producto_id,
         oi.producto_ref,
         oi.producto_nombre,
         oi.producto_precio,
         oi.cantidad,
         o.creado_en AS order_date,
         o.estado
       FROM orden_items oi
       INNER JOIN ordenes o ON o.id = oi.orden_id
       LEFT JOIN resenas_producto r
         ON r.orden_item_id = oi.id
        AND r.usuario_id = ?
       WHERE o.usuario_id = ?
         AND o.estado = 'entregado'
         AND r.id IS NULL
       ORDER BY o.creado_en DESC, oi.id DESC`,
      [userId, userId]
    );
    return rows;
  },

  async getEligibleItemForUser(userId, orderItemId) {
    const [rows] = await pool.query(
      `SELECT
         oi.id AS order_item_id,
         oi.orden_id,
         oi.producto_id,
         oi.producto_ref,
         oi.producto_nombre
       FROM orden_items oi
       INNER JOIN ordenes o ON o.id = oi.orden_id
       LEFT JOIN resenas_producto r
         ON r.orden_item_id = oi.id
        AND r.usuario_id = ?
       WHERE oi.id = ?
         AND o.usuario_id = ?
         AND o.estado = 'entregado'
         AND r.id IS NULL
       LIMIT 1`,
      [userId, orderItemId, userId]
    );
    return rows[0] || null;
  },

  async create(userId, data) {
    const [result] = await pool.query(
      `INSERT INTO resenas_producto
         (usuario_id, orden_id, orden_item_id, producto_id, producto_ref, calificacion, comentario)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        data.orden_id,
        data.orden_item_id,
        data.producto_id || null,
        data.producto_ref,
        data.calificacion,
        data.comentario
      ]
    );
    return result.insertId;
  },

  async getSummary() {
    const [rows] = await pool.query(
      `SELECT
         producto_id,
         producto_ref,
         COUNT(*) AS total_reviews,
         ROUND(AVG(calificacion), 1) AS average_rating
       FROM resenas_producto
       GROUP BY producto_id, producto_ref`
    );
    return rows;
  },

  async getByProduct(filters) {
    const conditions = [];
    const params = [];

    if (filters.productId) {
      conditions.push('r.producto_id = ?');
      params.push(filters.productId);
    }

    if (filters.productRef) {
      conditions.push('r.producto_ref = ?');
      params.push(filters.productRef);
    }

    if (conditions.length === 0) {
      return { summary: { average_rating: 0, total_reviews: 0 }, reviews: [] };
    }

    const whereClause = conditions.map(condition => `(${condition})`).join(' OR ');

    const [summaryRows] = await pool.query(
      `SELECT
         ROUND(AVG(r.calificacion), 1) AS average_rating,
         COUNT(*) AS total_reviews
       FROM resenas_producto r
       WHERE ${whereClause}`,
      params
    );

    const [reviews] = await pool.query(
      `SELECT
         r.id,
         r.calificacion,
         r.comentario,
         r.creado_en,
         u.nombre AS usuario_nombre
       FROM resenas_producto r
       INNER JOIN usuarios u ON u.id = r.usuario_id
       WHERE ${whereClause}
       ORDER BY r.creado_en DESC
       LIMIT 20`,
      params
    );

    return {
      summary: summaryRows[0] || { average_rating: 0, total_reviews: 0 },
      reviews
    };
  }
};

module.exports = Review;
