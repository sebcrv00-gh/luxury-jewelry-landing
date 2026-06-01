const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetCode = require('../models/PasswordResetCode');
const { getEmailDeliveryErrorMessage, sendEmail } = require('../services/emailService');

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

function maskEmail(email) {
  return email.replace(/^(.{2}).+(@.+)$/, '$1***$2');
}

async function sendRecoveryCodeEmail({ user, email, code }) {
  const customerName = user.nombre || 'Cliente';
  const subject = 'Codigo de recuperacion - Luxury Jewelry';
  const text =
    `Hola ${customerName},\n\n` +
    `Recibimos una solicitud para restablecer tu contrasena en Luxury Jewelry.\n\n` +
    `Tu codigo de recuperacion es: ${code}\n` +
    `Este codigo vence en ${CODE_TTL_MINUTES} minutos.\n\n` +
    `Si no solicitaste este cambio, puedes ignorar este correo.\n`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; background: #f8f5ee;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e6d8b1; border-radius: 16px; overflow: hidden;">
        <div style="padding: 24px 28px; background: #111111; color: #fdf8eb;">
          <p style="margin: 0; letter-spacing: 0.18em; font-size: 12px; color: #c9a84c;">LUXURY JEWELRY</p>
          <h1 style="margin: 12px 0 0; font-size: 24px; color: #fdf8eb;">Recuperacion de contrasena</h1>
        </div>
        <div style="padding: 28px;">
          <p style="margin: 0 0 12px;">Hola <strong>${customerName}</strong>,</p>
          <p style="margin: 0 0 18px; line-height: 1.6;">Recibimos una solicitud para restablecer la contrasena de tu cuenta.</p>
          <div style="margin: 24px 0; padding: 20px; text-align: center; background: #fdfaf3; border: 1px solid #e6d8b1; border-radius: 14px;">
            <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 0.16em; color: #8e6f1b;">CODIGO DE VERIFICACION</p>
            <p style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 0.3em; color: #111111;">${code}</p>
          </div>
          <p style="margin: 0 0 12px; line-height: 1.6;">Este codigo vence en <strong>${CODE_TTL_MINUTES} minutos</strong>.</p>
          <p style="margin: 0; line-height: 1.6; color: #5c5c5c;">Si no solicitaste este cambio, puedes ignorar este correo y tu contrasena seguira siendo la misma.</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject,
    text,
    html
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
      await sendRecoveryCodeEmail({ user, email, code });
    } catch (emailError) {
      await PasswordResetCode.deleteById(recoveryId);
      const friendlyError = new Error(getEmailDeliveryErrorMessage(emailError));
      friendlyError.statusCode =
        emailError.code === 'ETIMEDOUT' || emailError.command === 'CONN' ? 503 : 500;
      friendlyError.cause = emailError;
      throw friendlyError;
    }

    await PasswordResetCode.cleanupExpired();

    return res.json({
      ok: true,
      message:
        'Si el correo existe en nuestra base de datos, recibiras un codigo de recuperacion en los proximos minutos.',
      emailHint: maskEmail(email)
    });
  } catch (err) {
    console.error('Error en request-code:', err);
    return res
      .status(err.statusCode || 500)
      .json({ error: err.message || 'No fue posible enviar el codigo de recuperacion' });
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
