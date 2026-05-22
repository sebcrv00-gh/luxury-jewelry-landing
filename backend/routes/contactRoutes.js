const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Ticket = require('../models/Ticket');
const { isAuthenticated } = require('../middleware/auth');

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

    // 2. Intento de envío por Gmail (Opcional)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      connectionTimeout: 5000 
    });

    const mailOptions = {
      from: `"${name}" <${process.env.EMAIL_USER}>`,
      replyTo: email,
      to: 'luxuryjewellry95@gmail.com',
      subject: `${categoryLabel} en Panel Admin: ${name}`,
      text: `Tienes un ${safeCategory} de ${name}. Puedes gestionarlo en tu Panel de Administración.\n\nMensaje: ${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #c9a84c; border-radius: 8px;">
          <h2 style="color: #c9a84c;">${categoryLabel}</h2>
          <p>Has recibido un ${safeCategory} de <strong>${name}</strong>.</p>
          <p>Se ha guardado una copia en tu <strong>Dashboard de Luxury Jewelry</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="white-space: pre-wrap; background: #fdfaf3; padding: 15px; border-radius: 5px;">${message}</p>
        </div>
      `
    };

    // Envío en background para no retrasar la respuesta
    transporter.sendMail(mailOptions).catch(e => console.warn('Aviso: Gmail bloqueó el envío automático, pero el mensaje ya está en tu base de datos.'));

    res.status(200).json({ success: true, message: 'Mensaje recibido y guardado en tu panel.' });

  } catch (error) {
    console.error('Error procesando contacto:', error.message);
    res.status(500).json({ success: false, error: 'Error al procesar el mensaje.' });
  }
});

module.exports = router;
