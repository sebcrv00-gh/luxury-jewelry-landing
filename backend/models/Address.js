const { pool } = require('../config/db');

const Address = {
  async create(userId, data) {
    if (data.es_principal) {
      await pool.query('UPDATE direcciones SET es_principal = 0 WHERE usuario_id = ?', [userId]);
    }
    const [result] = await pool.query(
      `INSERT INTO direcciones (usuario_id, etiqueta, nombre_completo, telefono, direccion, ciudad, departamento, codigo_postal, es_principal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, data.etiqueta || 'Casa', data.nombre_completo, data.telefono, data.direccion, data.ciudad, data.departamento || null, data.codigo_postal || null, data.es_principal ? 1 : 0]
    );
    return result.insertId;
  },

  async update(id, userId, data) {
    if (data.es_principal) {
      await pool.query('UPDATE direcciones SET es_principal = 0 WHERE usuario_id = ?', [userId]);
    }
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'es_principal' ? (val ? 1 : 0) : val);
      }
    }
    if (fields.length === 0) return false;
    values.push(id, userId);
    await pool.query(`UPDATE direcciones SET ${fields.join(', ')} WHERE id = ? AND usuario_id = ?`, values);
    return true;
  },

  async delete(id, userId) {
    const [result] = await pool.query('DELETE FROM direcciones WHERE id = ? AND usuario_id = ?', [id, userId]);
    return result.affectedRows > 0;
  },

  async getByUser(userId) {
    const [rows] = await pool.query('SELECT * FROM direcciones WHERE usuario_id = ? ORDER BY es_principal DESC, creado_en DESC', [userId]);
    return rows;
  },

  async setDefault(id, userId) {
    await pool.query('UPDATE direcciones SET es_principal = 0 WHERE usuario_id = ?', [userId]);
    await pool.query('UPDATE direcciones SET es_principal = 1 WHERE id = ? AND usuario_id = ?', [id, userId]);
    return true;
  }
};

module.exports = Address;
