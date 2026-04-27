const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const items = await Wishlist.getByUser(req.session.userId);
    res.json(items);
  } catch (err) {
    console.error('Error wishlist:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/:productId', isAuthenticated, async (req, res) => {
  try {
    await Wishlist.add(req.session.userId, req.params.productId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error añadir wishlist:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/:productId', isAuthenticated, async (req, res) => {
  try {
    await Wishlist.remove(req.session.userId, req.params.productId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminar wishlist:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
