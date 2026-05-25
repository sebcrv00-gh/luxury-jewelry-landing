const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const PasswordResetCode = require('../models/PasswordResetCode');

const router = express.Router();
const CODE_TTL_MINUTES = Number(process.env.RECOVERY_CODE_TTL_MINUTES || 10);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function generateCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function createTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        : undefined
    });
  }

  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

function getFromAddress() {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || process.env.SMTP_USER;
}

async function sendRecoveryCodeEmail({ email, name, code }) {
  const transporter = createTransporter();
  const fromAddress = getFromAddress();

  if (!fromAddress) {
    throw new Error('No hay remitente configurado para el correo de recuperacion');
  }

  await transporter.sendMail({
    from: `"Luxury Jewelry" <${fromAddress}>`,
    to: email,
    subject: 'Codigo de recuperacion - Luxury Jewelry',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; border: 1px solid rgba(201,168,76,0.3); border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, rgba(201,168,76,0.15), rgba(183,110,121,0.08)); padding: 30px; text-align: center; border-bottom: 1px solid rgba(201,168,76,0.2);">
          <h1 style="color: #C9A84C; font-size: 1.6rem; margin: 0; letter-spacing: 3px;">LUXURY JEWELRY</h1>
          <p style="color: #999; font-size: 0.85rem; margin-top: 6px;">Restablecimiento de contrasena</p>
        </div>
        <div style="padding: 30px; text-align: center;">
          <p style="color: #ccc; font-size: 0.95rem; margin-bottom: 20px;">Hola <strong style="color: #E8D5A3;">${name}</strong>, usa este codigo para continuar con el cambio de tu contrasena:</p>
          <div style="background: rgba(201,168,76,0.08); border: 2px solid rgba(201,168,76,0.3); border-radius: 10px; padding: 20px; margin: 0 auto; display: inline-block;">
            <span style="font-size: 2.4rem; font-weight: 700; letter-spacing: 12px; color: #C9A84C;">${code}</span>
          </div>
          <p style="color: #888; font-size: 0.8rem; margin-top: 20px;">El codigo expira en <strong>${CODE_TTL_MINUTES} minutos</strong>.</p>
          <p style="color: #666; font-size: 0.75rem; margin-top: 12px;">Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      </div>
    `
  });
}

router.post('/request-code', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ error: 'El correo es obligatorio' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.json({
        ok: true,
        message: 'Si el correo existe en nuestra base de datos, recibiras un codigo de recuperacion.'
      });
    }

    const code = generateCode();
    const codeHash = hashValue(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await PasswordResetCode.invalidateForEmail(email);
    const recoveryId = await PasswordResetCode.create({ email, codeHash, expiresAt });

    try {
      await sendRecoveryCodeEmail({
        email,
        name: user.nombre || 'cliente',
        code
      });
    } catch (mailError) {
      await PasswordResetCode.deleteById(recoveryId);
      throw mailError;
    }

    await PasswordResetCode.cleanupExpired();

    return res.json({
      ok: true,
      message: 'Te enviamos un codigo de recuperacion a tu correo.',
      emailHint: email.replace(/^(.{2}).+(@.+)$/, '$1***$2')
    });
  } catch (err) {
    console.error('Error en request-code:', err);
    return res.status(500).json({ error: 'No fue posible enviar el codigo de recuperacion' });
  }
});

router.post('/verify-code', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();

    if (!email || !code) {
      return res.status(400).json({ error: 'Correo y codigo son obligatorios' });
    }

    const recovery = await PasswordResetCode.findValidByEmailAndHash(email, hashValue(code));
    if (!recovery) {
      return res.status(401).json({ error: 'El codigo es invalido o ya expiro' });
    }

    return res.json({
      ok: true,
      message: 'Codigo verificado. Ahora puedes definir tu nueva contrasena.'
    });
  } catch (err) {
    console.error('Error en verify-code:', err);
    return res.status(500).json({ error: 'No fue posible validar el codigo' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    const newPassword = String(req.body.newPassword || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'La confirmacion de la contrasena no coincide' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contrasena debe tener al menos 6 caracteres' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No se encontro una cuenta con ese correo' });
    }

    const recovery = await PasswordResetCode.findValidByEmailAndHash(email, hashValue(code));
    if (!recovery) {
      return res.status(401).json({ error: 'El codigo es invalido o ya expiro' });
    }

    const newHash = hashValue(newPassword);
    await User.update(user.id, { clave: newHash });
    await PasswordResetCode.markUsed(recovery.id);
    await PasswordResetCode.invalidateForEmail(email);
    await PasswordResetCode.cleanupExpired();

    return res.json({
      ok: true,
      message: 'Tu contrasena fue actualizada correctamente. Ya puedes iniciar sesion.'
    });
  } catch (err) {
    console.error('Error en reset-password:', err);
    return res.status(500).json({ error: 'No fue posible actualizar la contrasena' });
  }
});

module.exports = router;
