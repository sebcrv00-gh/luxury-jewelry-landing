const { pool } = require('../config/db');

const PasswordResetCode = {
  async invalidateForEmail(email) {
    await pool.query(
      'UPDATE password_reset_codes SET used_at = NOW() WHERE email = ? AND used_at IS NULL',
      [email]
    );
  },

  async create({ email, codeHash, expiresAt }) {
    const [result] = await pool.query(
      'INSERT INTO password_reset_codes (email, code_hash, expires_at) VALUES (?, ?, ?)',
      [email, codeHash, expiresAt]
    );
    return result.insertId;
  },

  async deleteById(id) {
    await pool.query('DELETE FROM password_reset_codes WHERE id = ?', [id]);
  },

  async findValidByEmailAndHash(email, codeHash) {
    const [rows] = await pool.query(
      `SELECT *
       FROM password_reset_codes
       WHERE email = ?
         AND code_hash = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, codeHash]
    );
    return rows[0] || null;
  },

  async markUsed(id) {
    await pool.query(
      'UPDATE password_reset_codes SET used_at = NOW() WHERE id = ? AND used_at IS NULL',
      [id]
    );
  },

  async cleanupExpired() {
    await pool.query(
      'DELETE FROM password_reset_codes WHERE used_at IS NOT NULL OR expires_at <= NOW()'
    );
  }
};

module.exports = PasswordResetCode;
