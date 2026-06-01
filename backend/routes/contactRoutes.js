const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { isAuthenticated } = require('../middleware/auth');
const {
  getAdminContactEmail,
  getEmailDeliveryErrorMessage,
  isEmailConfigured,
  sendEmail
} = require('../services/emailService');

router.post('/', isAuthenticated, async (req, res) => {
  const { name, email, phone, message, category } = req.body;
  const userId = req.session.userId;
  const safeCategory = category === 'reporte' ? 'reporte' : 'comentario';
  const categoryLabel = safeCategory === 'reporte' ? 'Reporte del sitio' : 'Comentario del sitio';

  try {
    // Guardar siempre el mensaje en base de datos, aunque falle el correo.
    await Ticket.create(userId, {
      asunto: `${categoryLabel} de ${name}`,
      mensaje: `TIPO: ${categoryLabel}\n\nMENSAJE CORE:\n${message}\n\n--- INFO ADICIONAL ---\nEmail: ${email}\nTeléfono: ${phone || 'No registrado'}`,
      orden_id: null
    });

    console.log(`✅ Mensaje de ${name} respaldado en base de datos.`);

    const adminRecipient = getAdminContactEmail();
    let responseMessage = 'Mensaje recibido y guardado en tu panel.';

    if (isEmailConfigured() && adminRecipient) {
      sendEmail({
        to: adminRecipient,
        replyTo: email,
        subject: `${categoryLabel} en Panel Admin: ${name}`,
        text:
          `Tienes un ${safeCategory} de ${name}. Puedes gestionarlo en tu Panel de Administracion.\n\n` +
          `Email: ${email}\n` +
          `Telefono: ${phone || 'No registrado'}\n\n` +
          `Mensaje:\n${message}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #c9a84c; border-radius: 8px;">
            <h2 style="color: #c9a84c;">${categoryLabel}</h2>
            <p>Has recibido un ${safeCategory} de <strong>${name}</strong>.</p>
            <p>Se ha guardado una copia en tu <strong>Dashboard de Luxury Jewelry</strong> y esta alerta se envio al correo administrativo.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Telefono:</strong> ${phone || 'No registrado'}</p>
            <p style="white-space: pre-wrap; background: #fdfaf3; padding: 15px; border-radius: 5px;">${message}</p>
          </div>
        `
      })
        .then(() => {
          console.log(`✅ Notificacion de contacto enviada al correo administrativo: ${adminRecipient}`);
        })
        .catch((emailError) => {
          console.warn(
            `Aviso: el mensaje se guardo en la base de datos, pero no se pudo notificar al correo administrativo. ${getEmailDeliveryErrorMessage(emailError)}`
          );
        });

      responseMessage =
        'Mensaje recibido y guardado en tu panel. Tambien intentamos notificarlo al correo administrativo.';
    } else {
      console.warn('Aviso: SMTP no esta configurado. El mensaje quedo guardado en la base de datos.');
      if (!adminRecipient) {
        console.warn('Aviso: ADMIN_CONTACT_EMAIL no esta configurado. No hay destinatario para la notificacion administrativa.');
      }
    }

    res.status(200).json({
      success: true,
      message: responseMessage,
      adminNotificationConfigured: Boolean(isEmailConfigured() && adminRecipient),
      adminRecipient: adminRecipient || null
    });

  } catch (error) {
    console.error('Error procesando contacto:', error.message);
    res.status(500).json({ success: false, error: 'Error al procesar el mensaje.' });
  }
});

module.exports = router;
