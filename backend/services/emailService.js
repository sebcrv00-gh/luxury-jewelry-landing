const nodemailer = require('nodemailer');

let transporter;
const SMTP_CONNECTION_TIMEOUT_MS = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000);
const SMTP_GREETING_TIMEOUT_MS = Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000);
const SMTP_SOCKET_TIMEOUT_MS = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000);

function getDefaultFrom() {
  return process.env.SMTP_FROM || '';
}

function getAdminContactEmail() {
  return process.env.ADMIN_CONTACT_EMAIL || getDefaultFrom();
}

function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      getDefaultFrom()
  );
}

function getSmtpPort() {
  return Number(process.env.SMTP_PORT || 587);
}

function useSecureConnection() {
  if (typeof process.env.SMTP_SECURE === 'string' && process.env.SMTP_SECURE.trim() !== '') {
    return process.env.SMTP_SECURE === 'true';
  }

  return getSmtpPort() === 465;
}

function getTransporter() {
  if (!isEmailConfigured()) {
    throw new Error('Las variables SMTP requeridas no estan configuradas');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: getSmtpPort(),
      secure: useSecureConnection(),
      connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
      greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
      socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
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

  if (error.code === 'EAUTH') {
    return 'Brevo rechazo las credenciales SMTP. Verifica SMTP_USER y SMTP_PASS en Render.';
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
