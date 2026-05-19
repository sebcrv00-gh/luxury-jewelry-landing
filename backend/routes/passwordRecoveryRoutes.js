const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const router = express.Router();

// In-memory store for recovery codes (code → { email, expires })
const recoveryCodes = new Map();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate random 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate random password (8 chars, letters + numbers)
function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// POST /api/recovery/request-code
router.post('/request-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'El correo es obligatorio' });

    const user = await User.findByEmail(email);
    if (!user) return res.status(404).json({ error: 'No existe una cuenta con ese correo electrónico' });

    const code = generateCode();
    recoveryCodes.set(code, { email, expires: Date.now() + 10 * 60 * 1000 }); // 10 min

    // Send code via email
    await transporter.sendMail({
      from: `"Luxury Jewelry" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Código de Recuperación — Luxury Jewelry',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; border: 1px solid rgba(201,168,76,0.3); border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(183,110,121,0.08)); padding: 30px; text-align: center; border-bottom: 1px solid rgba(201,168,76,0.2);">
            <h1 style="color: #C9A84C; font-size: 1.6rem; margin: 0; letter-spacing: 3px;">LUXURY JEWELRY</h1>
            <p style="color: #999; font-size: 0.85rem; margin-top: 6px;">Recuperación de Contraseña</p>
          </div>
          <div style="padding: 30px; text-align: center;">
            <p style="color: #ccc; font-size: 0.95rem; margin-bottom: 20px;">Hola <strong style="color: #E8D5A3;">${user.nombre}</strong>, tu código de verificación es:</p>
            <div style="background: rgba(201,168,76,0.08); border: 2px solid rgba(201,168,76,0.3); border-radius: 10px; padding: 20px; margin: 0 auto; display: inline-block;">
              <span style="font-size: 2.4rem; font-weight: 700; letter-spacing: 12px; color: #C9A84C;">${code}</span>
            </div>
            <p style="color: #888; font-size: 0.8rem; margin-top: 20px;">Este código expira en <strong>10 minutos</strong>.</p>
            <p style="color: #666; font-size: 0.75rem; margin-top: 12px;">Si no solicitaste este código, ignora este correo.</p>
          </div>
        </div>
      `
    });

    // Return phone hint if available
    const phoneHint = user.telefono 
      ? '****' + user.telefono.slice(-4) 
      : null;

    return res.json({ 
      ok: true, 
      message: 'Código enviado a tu correo electrónico',
      phoneHint 
    });
  } catch (err) {
    console.error('Error en request-code:', err);
    return res.status(500).json({ error: 'Error al enviar el código' });
  }
});

// POST /api/recovery/verify-code
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Correo y código son obligatorios' });

    const stored = recoveryCodes.get(code);
    if (!stored || stored.email !== email) {
      return res.status(401).json({ error: 'Código incorrecto o inválido' });
    }
    if (Date.now() > stored.expires) {
      recoveryCodes.delete(code);
      return res.status(410).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
    }

    // Code is valid — generate new password
    recoveryCodes.delete(code);
    const newPassword = generatePassword();
    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    const user = await User.findByEmail(email);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await User.update(user.id, { clave: newHash });

    // Send new password via email
    await transporter.sendMail({
      from: `"Luxury Jewelry" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔑 Tu Nueva Contraseña — Luxury Jewelry',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; border: 1px solid rgba(201,168,76,0.3); border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(183,110,121,0.08)); padding: 30px; text-align: center; border-bottom: 1px solid rgba(201,168,76,0.2);">
            <h1 style="color: #C9A84C; font-size: 1.6rem; margin: 0; letter-spacing: 3px;">LUXURY JEWELRY</h1>
            <p style="color: #999; font-size: 0.85rem; margin-top: 6px;">Contraseña Actualizada</p>
          </div>
          <div style="padding: 30px; text-align: center;">
            <p style="color: #ccc; font-size: 0.95rem; margin-bottom: 20px;">Hola <strong style="color: #E8D5A3;">${user.nombre}</strong>, tu nueva contraseña temporal es:</p>
            <div style="background: rgba(201,168,76,0.08); border: 2px solid rgba(201,168,76,0.3); border-radius: 10px; padding: 20px; margin: 0 auto; display: inline-block;">
              <span style="font-size: 1.6rem; font-weight: 700; letter-spacing: 5px; color: #C9A84C;">${newPassword}</span>
            </div>
            <p style="color: #888; font-size: 0.8rem; margin-top: 20px;">Te recomendamos cambiar esta contraseña desde tu perfil.</p>
          </div>
        </div>
      `
    });

    return res.json({ ok: true, message: 'Nueva contraseña enviada a tu correo electrónico' });
  } catch (err) {
    console.error('Error en verify-code:', err);
    return res.status(500).json({ error: 'Error al verificar el código' });
  }
});

module.exports = router;
