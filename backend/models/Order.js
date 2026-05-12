const { pool } = require('../config/db');

const Order = {
  /**
   * Crea una orden con sus items en una transacción.
   * Reduce el stock de los productos con ID de base de datos.
   */
  async create(userId, shipping, items) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const subtotal = items.reduce((sum, i) => {
        const p = parseFloat(i.precio) || 0;
        const q = parseInt(i.cantidad) || 0;
        return sum + (p * q);
      }, 0);
      const SHIPPING_COST = 15000;
      const total = subtotal + SHIPPING_COST;

      const [orderResult] = await conn.query(
        `INSERT INTO ordenes (usuario_id, total, costo_envio, nombre_envio, telefono_envio, direccion_envio, ciudad_envio, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, total, SHIPPING_COST, shipping.nombre, shipping.telefono, shipping.direccion, shipping.ciudad, shipping.notas || null]
      );

      const orderId = orderResult.insertId;

      for (const item of items) {
        const subtotal = item.precio * item.cantidad;
        await conn.query(
          `INSERT INTO orden_items (orden_id, producto_nombre, producto_precio, cantidad, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [orderId, item.nombre, item.precio, item.cantidad, subtotal]
        );

        // Si el producto viene de la base de datos, reducir stock
        if (item.id && String(item.id).startsWith('db_')) {
          const dbId = String(item.id).replace('db_', '');
          await conn.query(
            'UPDATE productos SET stock = GREATEST(stock - ?, 0) WHERE id = ?',
            [item.cantidad, dbId]
          );
        }
      }

      await conn.commit();
      return { id: orderId, total };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /** Obtiene todas las órdenes de un usuario */
  async getByUserId(userId) {
    const [orders] = await pool.query(
      'SELECT * FROM ordenes WHERE usuario_id = ? ORDER BY creado_en DESC',
      [userId]
    );
    return orders;
  },

  /** Obtiene todas las órdenes con items incluidos */
  async getByUserIdWithItems(userId) {
    const [orders] = await pool.query(
      'SELECT * FROM ordenes WHERE usuario_id = ? ORDER BY creado_en DESC',
      [userId]
    );
    for (const order of orders) {
      const [items] = await pool.query('SELECT * FROM orden_items WHERE orden_id = ?', [order.id]);
      order.items = items;
    }
    return orders;
  },

  /** Obtiene una orden con sus items */
  async getById(orderId) {
    const [orders] = await pool.query('SELECT * FROM ordenes WHERE id = ?', [orderId]);
    if (!orders[0]) return null;

    const [items] = await pool.query('SELECT * FROM orden_items WHERE orden_id = ?', [orderId]);
    return { ...orders[0], items };
  },

  /** Obtiene todas las órdenes (para admin) */
  async getAll() {
    const [orders] = await pool.query('SELECT o.*, u.nombre as usuario_nombre, u.email as usuario_email FROM ordenes o JOIN usuarios u ON o.usuario_id = u.id ORDER BY o.creado_en DESC');
    return orders;
  }
};

module.exports = Order;
