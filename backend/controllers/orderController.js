const Order = require('../models/Order');

const orderController = {
  // POST /api/orders — Crear una nueva orden
  async create(req, res) {
    try {
      const userId = req.session.userId;
      const { shipping, items } = req.body;

      if (!shipping || !items || items.length === 0) {
        return res.status(400).json({ error: 'Datos de envío e items son obligatorios' });
      }
      if (!shipping.nombre || !shipping.telefono || !shipping.direccion || !shipping.ciudad) {
        return res.status(400).json({ error: 'Completa todos los campos de envío' });
      }

      const order = await Order.create(userId, shipping, items);
      return res.json({ ok: true, orderId: order.id, total: order.total });
    } catch (err) {
      console.error('Error al crear orden:', err);
      return res.status(500).json({ error: 'Error al procesar la orden' });
    }
  },

  // GET /api/orders — Órdenes del usuario actual
  async getMyOrders(req, res) {
    try {
      const orders = await Order.getByUserId(req.session.userId);
      return res.json(orders);
    } catch (err) {
      console.error('Error al obtener órdenes:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // GET /api/orders/mine/detailed — Órdenes con items
  async getMyOrdersDetailed(req, res) {
    try {
      const orders = await Order.getByUserIdWithItems(req.session.userId);
      return res.json(orders);
    } catch (err) {
      console.error('Error al obtener órdenes detalladas:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // GET /api/orders/:id — Detalle de una orden
  async getById(req, res) {
    try {
      const order = await Order.getById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

      // Solo el dueño o un admin puede verla
      if (order.usuario_id !== req.session.userId && req.session.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado' });
      }
      return res.json(order);
    } catch (err) {
      console.error('Error al obtener orden:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  },

  // GET /api/orders/admin/all — Todas las órdenes (admin)
  async getAll(req, res) {
    try {
      const orders = await Order.getAll();
      return res.json(orders);
    } catch (err) {
      console.error('Error al obtener todas las órdenes:', err);
      return res.status(500).json({ error: 'Error del servidor' });
    }
  }
};

module.exports = orderController;
