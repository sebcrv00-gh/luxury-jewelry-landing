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

  async getDetailedById(id) {
    const [rows] = await pool.query(
      `SELECT t.*, u.nombre AS usuario_nombre, u.email AS usuario_email, u.telefono AS usuario_telefono
       FROM tickets_soporte t
       JOIN usuarios u ON t.usuario_id = u.id
       WHERE t.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async updateStatus(id, estado) {
    await pool.query('UPDATE tickets_soporte SET estado = ? WHERE id = ?', [estado, id]);
    return true;
  },

  async addReply(ticketId, authorType, authorId, message) {
    const [result] = await pool.query(
      'INSERT INTO ticket_respuestas (ticket_id, author_type, author_id, mensaje) VALUES (?, ?, ?, ?)',
      [ticketId, authorType, authorId || null, message]
    );
    return result.insertId;
  },

  async getReplies(ticketId) {
    const [rows] = await pool.query(
      `SELECT tr.*,
              u.nombre AS author_name,
              u.email AS author_email
       FROM ticket_respuestas tr
       LEFT JOIN usuarios u ON tr.author_id = u.id
       WHERE tr.ticket_id = ?
       ORDER BY tr.creado_en ASC, tr.id ASC`,
      [ticketId]
    );
    return rows;
  },

  async getAll() {
    const [rows] = await pool.query(
      `SELECT t.*, u.nombre as usuario_nombre, u.email as usuario_email, u.telefono as usuario_telefono
       FROM tickets_soporte t JOIN usuarios u ON t.usuario_id = u.id
       ORDER BY t.creado_en DESC`
    );
    return rows;
  },

  async getConversation(ticketId) {
    const ticket = await this.getDetailedById(ticketId);
    if (!ticket) return null;

    const replies = await this.getReplies(ticketId);
    const initialMessage = {
      id: `ticket-${ticket.id}`,
      ticket_id: ticket.id,
      author_type: 'cliente',
      author_id: ticket.usuario_id,
      author_name: ticket.usuario_nombre,
      author_email: ticket.usuario_email,
      mensaje: ticket.mensaje,
      creado_en: ticket.creado_en,
      is_initial: true
    };

    return {
      ticket,
      messages: [initialMessage, ...replies]
    };
  }
};

module.exports = Ticket;
