const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

async function loadAccessibleTicket(req, res) {
  const ticket = await Ticket.getDetailedById(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket no encontrado' });
    return null;
  }

  const canAccess =
    req.session.rol === 'admin' || Number(ticket.usuario_id) === Number(req.session.userId);

  if (!canAccess) {
    res.status(403).json({ error: 'No tienes permisos para acceder a este ticket' });
    return null;
  }

  return ticket;
}

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

router.get('/:id/messages', isAuthenticated, async (req, res) => {
  try {
    const ticket = await loadAccessibleTicket(req, res);
    if (!ticket) return;

    const conversation = await Ticket.getConversation(ticket.id);
    res.json(conversation);
  } catch (err) {
    console.error('Error conversación ticket:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/:id/messages', isAuthenticated, async (req, res) => {
  try {
    const ticket = await loadAccessibleTicket(req, res);
    if (!ticket) return;

    const mensaje = String(req.body.mensaje || '').trim();
    if (!mensaje) {
      return res.status(400).json({ error: 'El mensaje es obligatorio' });
    }

    const authorType = req.session.rol === 'admin' ? 'admin' : 'cliente';
    await Ticket.addReply(ticket.id, authorType, req.session.userId, mensaje);

    if (authorType === 'cliente' && ticket.estado === 'cerrado') {
      await Ticket.updateStatus(ticket.id, 'abierto');
    }

    const conversation = await Ticket.getConversation(ticket.id);
    res.json({ ok: true, conversation });
  } catch (err) {
    console.error('Error responder ticket:', err);
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
