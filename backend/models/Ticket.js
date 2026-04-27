const { pool } = require('../config/db');

const Ticket = {
  async create(userId, data) {
    const [result] = await pool.query(
      'INSERT INTO tickets_soporte (usuario_id, asunto, mensaje, orden_id) VALUES (?, ?, ?, ?)',
      [userId, data.asunto, data.mensaje, data.orden_id || null]
    );
    return result.insertId;
  },

  async getByUser(userId) {
    const [rows] = await pool.query(
      'SELECT * FROM tickets_soporte WHERE usuario_id = ? ORDER BY creado_en DESC',
      [userId]
    );
    return rows;
  },

  async getById(id) {
    const [rows] = await pool.query('SELECT * FROM tickets_soporte WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async updateStatus(id, estado) {
    await pool.query('UPDATE tickets_soporte SET estado = ? WHERE id = ?', [estado, id]);
    return true;
  },

  async getAll() {
    const [rows] = await pool.query(
      `SELECT t.*, u.nombre as usuario_nombre, u.email as usuario_email
       FROM tickets_soporte t JOIN usuarios u ON t.usuario_id = u.id
       ORDER BY t.creado_en DESC`
    );
    return rows;
  }
};

module.exports = Ticket;
