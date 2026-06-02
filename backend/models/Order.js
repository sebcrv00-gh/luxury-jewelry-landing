const { pool, buildProductRef } = require('../config/db');

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
        const productMatch = item.id
          ? String(item.id).match(/^db_(\d+)(?:__variant_(\d+))?$/)
          : null;
        const dbId = productMatch ? Number(productMatch[1]) : null;
        const variantId = productMatch && productMatch[2] ? Number(productMatch[2]) : null;
        const displayName = item.color ? `${item.nombre} - ${item.color}` : item.nombre;
        const productRef = dbId ? `db_${dbId}` : buildProductRef(item.nombre);

        await conn.query(
          `INSERT INTO orden_items (orden_id, producto_id, producto_ref, producto_nombre, producto_precio, cantidad, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [orderId, dbId, productRef, displayName, item.precio, item.cantidad, subtotal]
        );

        if (variantId) {
          await conn.query(
            'UPDATE producto_variantes SET stock = GREATEST(stock - ?, 0) WHERE id = ? AND producto_id = ?',
            [item.cantidad, variantId, dbId]
          );
          const [variantStockRows] = await conn.query(
            'SELECT COALESCE(SUM(stock), 0) AS total_stock FROM producto_variantes WHERE producto_id = ?',
            [dbId]
          );
          await conn.query(
            'UPDATE productos SET stock = ? WHERE id = ?',
            [Number(variantStockRows[0]?.total_stock || 0), dbId]
          );
        } else if (dbId) {
          // Si el producto viene de la base de datos, reducir stock
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
  },

  async getAllDetailed() {
    const [orders] = await pool.query(
      `SELECT
         o.*,
         u.nombre AS usuario_nombre,
         u.email AS usuario_email,
         u.telefono AS usuario_telefono,
         u.direccion AS usuario_direccion
       FROM ordenes o
       JOIN usuarios u ON o.usuario_id = u.id
       ORDER BY o.creado_en DESC`
    );

    if (orders.length === 0) {
      return [];
    }

    const orderIds = orders.map((order) => order.id);
    const [items] = await pool.query(
      `SELECT *
       FROM orden_items
       WHERE orden_id IN (?)
       ORDER BY orden_id DESC, id ASC`,
      [orderIds]
    );

    const itemsByOrderId = new Map();
    items.forEach((item) => {
      if (!itemsByOrderId.has(item.orden_id)) {
        itemsByOrderId.set(item.orden_id, []);
      }
      itemsByOrderId.get(item.orden_id).push(item);
    });

    return orders.map((order) => ({
      ...order,
      items: itemsByOrderId.get(order.id) || []
    }));
  },

  async updateStatus(orderId, estado) {
    const [result] = await pool.query(
      'UPDATE ordenes SET estado = ? WHERE id = ?',
      [estado, orderId]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    const [orders] = await pool.query(
      'SELECT o.*, u.nombre as usuario_nombre, u.email as usuario_email FROM ordenes o JOIN usuarios u ON o.usuario_id = u.id WHERE o.id = ? LIMIT 1',
      [orderId]
    );

    return orders[0] || null;
  }
};

module.exports = Order;
