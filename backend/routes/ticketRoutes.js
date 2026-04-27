const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const tickets = await Ticket.getByUser(req.session.userId);
    res.json(tickets);
  } catch (err) {
    console.error('Error tickets:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { asunto, mensaje, orden_id } = req.body;
    if (!asunto || !mensaje) return res.status(400).json({ error: 'Asunto y mensaje son obligatorios' });
    const id = await Ticket.create(req.session.userId, { asunto, mensaje, orden_id });
    res.json({ ok: true, id });
  } catch (err) {
    console.error('Error crear ticket:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/admin/all', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const tickets = await Ticket.getAll();
    res.json(tickets);
  } catch (err) {
    console.error('Error tickets admin:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:id/status', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await Ticket.updateStatus(req.params.id, req.body.estado);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error actualizar ticket:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
