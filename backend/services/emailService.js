const nodemailer = require('nodemailer');

let transporter;

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

module.exports = {
  getAdminContactEmail,
  getDefaultFrom,
  isEmailConfigured,
  sendEmail
};
