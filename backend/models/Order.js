const { pool } = require('../config/db');

class OrderValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'OrderValidationError';
    this.statusCode = statusCode;
  }
}

const SHIPPING_COST = 15000;

const parseCartItemId = (itemId) => {
  const match = typeof itemId === 'string'
    ? itemId.match(/^db_(\d+)(?:__variant_(\d+))?$/)
    : null;

  if (!match) return null;

  return {
    productId: Number(match[1]),
    variantId: match[2] ? Number(match[2]) : null
  };
};

const normalizeQuantity = (value) => {
  const quantity = Number.parseInt(value, 10);
  return Number.isFinite(quantity) ? quantity : 0;
};

const Order = {
  /**
   * Crea una orden con sus items en una transacción.
   * Reduce el stock de los productos con ID de base de datos.
   */
  async create(userId, shipping, items) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      let shippingCost = SHIPPING_COST;
      let freeShippingApplied = false;

      const [userRows] = await conn.query(
        'SELECT id, primer_envio_gratis_usado FROM usuarios WHERE id = ? LIMIT 1 FOR UPDATE',
        [userId]
      );
      const userRow = userRows[0];
      if (!userRow) {
        throw new OrderValidationError('Usuario no encontrado. Vuelve a iniciar sesion para continuar.', 401);
      }
      if (Number(userRow.primer_envio_gratis_usado || 0) === 0) {
        const [existingOrderRows] = await conn.query(
          'SELECT id FROM ordenes WHERE usuario_id = ? LIMIT 1',
          [userId]
        );

        if (existingOrderRows.length === 0) {
          shippingCost = 0;
          freeShippingApplied = true;
        }

        await conn.query('UPDATE usuarios SET primer_envio_gratis_usado = 1 WHERE id = ?', [userId]);
      }

      const normalizedItems = [];
      for (const item of items) {
        const parsedIds = parseCartItemId(item.id);
        if (!parsedIds?.productId) {
          throw new OrderValidationError('Uno de los productos del carrito ya no es valido. Actualiza tu carrito antes de continuar.');
        }

        const quantity = normalizeQuantity(item.cantidad);
        if (quantity <= 0) {
          throw new OrderValidationError('La cantidad solicitada para uno de los productos no es valida.');
        }

        const [productRows] = await conn.query(
          'SELECT id, nombre, precio, stock FROM productos WHERE id = ? LIMIT 1 FOR UPDATE',
          [parsedIds.productId]
        );
        const product = productRows[0];

        if (!product) {
          throw new OrderValidationError('Uno de los productos del carrito ya no existe. Actualiza tu carrito antes de continuar.');
        }

        if (parsedIds.variantId) {
          const [variantRows] = await conn.query(
            `SELECT id, producto_id, stock, orden
             FROM producto_variantes
             WHERE id = ? AND producto_id = ?
             LIMIT 1
             FOR UPDATE`,
            [parsedIds.variantId, parsedIds.productId]
          );
          const variant = variantRows[0];

          if (!variant) {
            throw new OrderValidationError(`La variante seleccionada para "${product.nombre}" ya no existe. Vuelve a seleccionar el producto.`);
          }

          if (quantity > Number(variant.stock || 0)) {
            throw new OrderValidationError(`No hay stock suficiente para la variante seleccionada de "${product.nombre}".`);
          }

          const lineSubtotal = Number(product.precio) * quantity;
          normalizedItems.push({
            producto_id: product.id,
            producto_ref: `db_${product.id}`,
            producto_nombre: product.nombre,
            producto_precio: Number(product.precio),
            cantidad: quantity,
            subtotal: lineSubtotal,
            variantId: variant.id
          });
        } else {
          const [variantCountRows] = await conn.query(
            'SELECT COUNT(*) AS total_variants FROM producto_variantes WHERE producto_id = ?',
            [parsedIds.productId]
          );
          if (Number(variantCountRows[0]?.total_variants || 0) > 0) {
            throw new OrderValidationError(`"${product.nombre}" requiere seleccionar una variante antes de finalizar la compra.`);
          }

          if (quantity > Number(product.stock || 0)) {
            throw new OrderValidationError(`No hay stock suficiente para "${product.nombre}".`);
          }

          const lineSubtotal = Number(product.precio) * quantity;
          normalizedItems.push({
            producto_id: product.id,
            producto_ref: `db_${product.id}`,
            producto_nombre: product.nombre,
            producto_precio: Number(product.precio),
            cantidad: quantity,
            subtotal: lineSubtotal,
            variantId: null
          });
        }
      }

      const subtotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const total = subtotal + shippingCost;

      const [orderResult] = await conn.query(
        `INSERT INTO ordenes (usuario_id, total, costo_envio, nombre_envio, telefono_envio, direccion_envio, ciudad_envio, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, total, shippingCost, shipping.nombre, shipping.telefono, shipping.direccion, shipping.ciudad, shipping.notas || null]
      );

      const orderId = orderResult.insertId;

      for (const item of normalizedItems) {
        await conn.query(
          `INSERT INTO orden_items (orden_id, producto_id, producto_ref, producto_nombre, producto_precio, cantidad, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.producto_id, item.producto_ref, item.producto_nombre, item.producto_precio, item.cantidad, item.subtotal]
        );

        if (item.variantId) {
          await conn.query(
            'UPDATE producto_variantes SET stock = stock - ? WHERE id = ? AND producto_id = ?',
            [item.cantidad, item.variantId, item.producto_id]
          );
          const [variantStockRows] = await conn.query(
            'SELECT COALESCE(SUM(stock), 0) AS total_stock FROM producto_variantes WHERE producto_id = ?',
            [item.producto_id]
          );
          await conn.query(
            'UPDATE productos SET stock = ? WHERE id = ?',
            [Number(variantStockRows[0]?.total_stock || 0), item.producto_id]
          );
        } else {
          await conn.query(
            'UPDATE productos SET stock = stock - ? WHERE id = ?',
            [item.cantidad, item.producto_id]
          );
        }
      }

      await conn.commit();
      return { id: orderId, total, shippingCost, freeShippingApplied };
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
module.exports.OrderValidationError = OrderValidationError;
