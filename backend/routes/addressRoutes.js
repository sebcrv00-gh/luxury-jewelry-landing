const express = require('express');
const router = express.Router();
const Address = require('../models/Address');
const { isAuthenticated } = require('../middleware/auth');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const addresses = await Address.getByUser(req.session.userId);
    res.json(addresses);
  } catch (err) {
    console.error('Error direcciones:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const id = await Address.create(req.session.userId, req.body);
    res.json({ ok: true, id });
  } catch (err) {
    console.error('Error crear dirección:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    await Address.update(req.params.id, req.session.userId, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error actualizar dirección:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    await Address.delete(req.params.id, req.session.userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error eliminar dirección:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id/default', isAuthenticated, async (req, res) => {
  try {
    await Address.setDefault(req.params.id, req.session.userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error marcar principal:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
