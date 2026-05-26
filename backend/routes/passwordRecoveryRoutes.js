const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
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

async function createManualRecoveryTicket({ user, email, code }) {
  return Ticket.create(user.id, {
    asunto: 'Recuperacion de contrasena',
    mensaje:
      `SOLICITUD DE RECUPERACION MANUAL\n\n` +
      `Cliente: ${user.nombre || 'Cliente'}\n` +
      `Email: ${email}\n` +
      `Codigo temporal: ${code}\n` +
      `Vence en: ${CODE_TTL_MINUTES} minutos\n\n` +
      `Accion requerida:\n` +
      `1. Verificar identidad del cliente por un canal manual.\n` +
      `2. Compartir este codigo solo despues de validar la solicitud.\n` +
      `3. Marcar el ticket como resuelto cuando el cliente recupere el acceso.`,
    orden_id: null
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
      await createManualRecoveryTicket({ user, email, code });
    } catch (ticketError) {
      await PasswordResetCode.deleteById(recoveryId);
      throw ticketError;
    }

    await PasswordResetCode.cleanupExpired();

    return res.json({
      ok: true,
      message:
        'Solicitud registrada. Nuestro equipo de soporte revisara tu cuenta y te compartira el codigo de recuperacion por un canal manual.',
      emailHint: email.replace(/^(.{2}).+(@.+)$/, '$1***$2')
    });
  } catch (err) {
    console.error('Error en request-code:', err);
    return res.status(500).json({ error: 'No fue posible registrar la solicitud de recuperacion' });
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
