const nodemailer = require('nodemailer');

let transporter;
let transporterCacheKey = '';
const SMTP_CONNECTION_TIMEOUT_MS = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000);
const SMTP_GREETING_TIMEOUT_MS = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000);
const SMTP_SOCKET_TIMEOUT_MS = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000);

function readEnvValue(key) {
  const rawValue = process.env[key];
  if (typeof rawValue !== 'string') {
    return '';
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return '';
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getSmtpPort() {
  const parsed = Number(readEnvValue('SMTP_PORT') || 587);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
}

function parseBooleanEnv(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
}

function useSecureConnection() {
  const explicitSecure = parseBooleanEnv(readEnvValue('SMTP_SECURE'));
  if (explicitSecure !== null) {
    return explicitSecure;
  }

  return getSmtpPort() === 465;
}

function getSmtpConfig() {
  return {
    host: readEnvValue('SMTP_HOST'),
    port: getSmtpPort(),
    secure: useSecureConnection(),
    user: readEnvValue('SMTP_USER'),
    pass: readEnvValue('SMTP_PASS'),
    from: readEnvValue('SMTP_FROM'),
    adminContactEmail: readEnvValue('ADMIN_CONTACT_EMAIL')
  };
}

function getDefaultFrom() {
  return getSmtpConfig().from;
}

function getAdminContactEmail() {
  const config = getSmtpConfig();
  return config.adminContactEmail || config.from;
}

function isEmailConfigured() {
  const config = getSmtpConfig();
  return Boolean(config.host && config.port && config.user && config.pass && config.from);
}

function getTransporter() {
  if (!isEmailConfigured()) {
    throw new Error(
      'Las variables SMTP requeridas no estan configuradas correctamente. Revisa SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y SMTP_FROM.'
    );
  }

  const config = getSmtpConfig();
  const cacheKey = JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    pass: config.pass
  });

  if (!transporter || transporterCacheKey !== cacheKey) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure && config.port !== 25,
      connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
      greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
      socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
    transporterCacheKey = cacheKey;
  }

  return transporter;
}

async function sendEmail({ to, subject, html, text, replyTo, from }) {
  const sender = from || getDefaultFrom();
  if (!sender) {
    throw new Error('SMTP_FROM no esta configurado');
  }

  const payload = {
    from: sender,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text
  };

  if (replyTo) {
    payload.replyTo = Array.isArray(replyTo) ? replyTo.join(', ') : replyTo;
  }

  return getTransporter().sendMail(payload);
}

function getEmailDeliveryErrorMessage(error) {
  if (!error) {
    return 'No fue posible enviar el correo';
  }

  if (error.code === 'ETIMEDOUT' || error.command === 'CONN') {
    return 'La conexion con Brevo SMTP excedio el tiempo de espera. Revisa el puerto SMTP en Render e intenta con 2525 o 465 si 587 sigue fallando.';
  }

  if (
    error.code === 'EAUTH' ||
    error.code === 'ESOCKET' ||
    error.responseCode === 534 ||
    error.responseCode === 535
  ) {
    return 'Brevo rechazo las credenciales SMTP. Verifica SMTP_USER y SMTP_PASS en Render, elimina comillas o espacios sobrantes y confirma que SMTP_SECURE coincida con el puerto configurado.';
  }

  if (error.responseCode === 550 || error.responseCode === 553) {
    return 'Brevo rechazo el remitente configurado. Verifica que SMTP_FROM coincida con un sender aprobado.';
  }

  return error.message || 'No fue posible enviar el correo';
}

module.exports = {
  getEmailDeliveryErrorMessage,
  getAdminContactEmail,
  getDefaultFrom,
  isEmailConfigured,
  sendEmail
};
