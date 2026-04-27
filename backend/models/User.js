const { pool } = require('../config/db');

const User = {
  async findAll() {
    const [rows] = await pool.query(`
      SELECT 
        u.id, u.nombre, u.email, u.rol, u.telefono, u.direccion, u.foto,
        COUNT(o.id) as total_pedidos
      FROM usuarios u 
      LEFT JOIN ordenes o ON u.id = o.usuario_id 
      GROUP BY u.id 
      ORDER BY u.id DESC
    `);
    return rows;
  },

  async makeVip(id) {
    const [result] = await pool.query('UPDATE usuarios SET rol = ? WHERE id = ?', ['vip', id]);
    return result.affectedRows > 0;
  },

  async removeVip(id) {
    const [result] = await pool.query('UPDATE usuarios SET rol = ? WHERE id = ?', ['cliente', id]);
    return result.affectedRows > 0;
  },

  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT id, nombre, email, rol, telefono, direccion, foto FROM usuarios WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(nombre, email, claveHash) {
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, clave) VALUES (?, ?, ?)',
      [nombre, email, claveHash]
    );
    return result.insertId;
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }
    if (fields.length === 0) return false;
    values.push(id);
    await pool.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  },

  async delete(id) {
    const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

module.exports = User;
