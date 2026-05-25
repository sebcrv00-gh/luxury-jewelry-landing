const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { isAuthenticated } = require('../middleware/auth');
const { getAdminContactEmail, isEmailConfigured, sendEmail } = require('../services/emailService');

router.post('/', isAuthenticated, async (req, res) => {
  const { name, email, phone, message, category } = req.body;
  const userId = req.session.userId;
  const safeCategory = category === 'reporte' ? 'reporte' : 'comentario';
  const categoryLabel = safeCategory === 'reporte' ? 'Reporte del sitio' : 'Comentario del sitio';

  try {
    // 1. Guardar en Base de Datos (Sistema de Respaldo Infalible)
    await Ticket.create(userId, {
      asunto: `${categoryLabel} de ${name}`,
      mensaje: `TIPO: ${categoryLabel}\n\nMENSAJE CORE:\n${message}\n\n--- INFO ADICIONAL ---\nEmail: ${email}\nTeléfono: ${phone || 'No registrado'}`,
      orden_id: null
    });

    console.log(`✅ Mensaje de ${name} respaldado en base de datos.`);

    const adminRecipient = getAdminContactEmail();
    if (isEmailConfigured() && adminRecipient) {
      sendEmail({
        to: adminRecipient,
        replyTo: email,
        subject: `${categoryLabel} en Panel Admin: ${name}`,
        text: `Tienes un ${safeCategory} de ${name}. Puedes gestionarlo en tu Panel de Administracion.\n\nMensaje: ${message}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #c9a84c; border-radius: 8px;">
            <h2 style="color: #c9a84c;">${categoryLabel}</h2>
            <p>Has recibido un ${safeCategory} de <strong>${name}</strong>.</p>
            <p>Se ha guardado una copia en tu <strong>Dashboard de Luxury Jewelry</strong>.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="white-space: pre-wrap; background: #fdfaf3; padding: 15px; border-radius: 5px;">${message}</p>
          </div>
        `
      }).catch(() => {
        console.warn('Aviso: no se pudo enviar la notificacion con Resend, pero el mensaje ya esta guardado en la base de datos.');
      });
    } else {
      console.warn('Aviso: Resend no esta configurado. El mensaje quedo guardado en la base de datos.');
    }

    res.status(200).json({ success: true, message: 'Mensaje recibido y guardado en tu panel.' });

  } catch (error) {
    console.error('Error procesando contacto:', error.message);
    res.status(500).json({ success: false, error: 'Error al procesar el mensaje.' });
  }
});

module.exports = router;
