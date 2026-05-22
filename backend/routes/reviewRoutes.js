const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { isAuthenticated } = require('../middleware/auth');

router.get('/summary', async (req, res) => {
  try {
    const summary = await Review.getSummary();
    res.json(summary);
  } catch (err) {
    console.error('Error al obtener resumen de reseñas:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/product', async (req, res) => {
  try {
    const productId = req.query.productId ? Number(req.query.productId) : null;
    const productRef = req.query.productRef ? String(req.query.productRef).trim() : '';

    if (!productId && !productRef) {
      return res.status(400).json({ error: 'Debes indicar un producto válido' });
    }

    const data = await Review.getByProduct({ productId, productRef });
    res.json(data);
  } catch (err) {
    console.error('Error al obtener reseñas del producto:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/eligible', isAuthenticated, async (req, res) => {
  try {
    const items = await Review.getEligibleByUser(req.session.userId);
    res.json(items);
  } catch (err) {
    console.error('Error al obtener productos calificables:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const orderItemId = Number(req.body.orderItemId);
    const calificacion = Number(req.body.calificacion);
    const comentario = String(req.body.comentario || '').trim();

    if (!orderItemId || !Number.isInteger(orderItemId)) {
      return res.status(400).json({ error: 'Selecciona un producto de una compra entregada' });
    }

    if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ error: 'La calificación debe estar entre 1 y 5 estrellas' });
    }

    if (!comentario) {
      return res.status(400).json({ error: 'Escribe tu reseña para publicar la calificación' });
    }

    const eligibleItem = await Review.getEligibleItemForUser(req.session.userId, orderItemId);
    if (!eligibleItem) {
      return res.status(400).json({ error: 'Ese producto no está disponible para reseñar o ya fue calificado' });
    }

    await Review.create(req.session.userId, {
      orden_id: eligibleItem.orden_id,
      orden_item_id: eligibleItem.order_item_id,
      producto_id: eligibleItem.producto_id,
      producto_ref: eligibleItem.producto_ref,
      calificacion,
      comentario
    });

    res.json({ ok: true, message: 'Reseña publicada correctamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese producto ya fue reseñado desde esta compra' });
    }
    console.error('Error al publicar reseña:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
