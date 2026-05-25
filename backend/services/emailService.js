const https = require('https');

const RESEND_API_URL = 'https://api.resend.com/emails';

function getDefaultFrom() {
  return process.env.RESEND_FROM_EMAIL || '';
}

function getAdminContactEmail() {
  return process.env.ADMIN_CONTACT_EMAIL || getDefaultFrom();
}

function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && getDefaultFrom());
}

function sendResendRequest(payload) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      RESEND_API_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        }
      },
      (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          const parsed = data ? JSON.parse(data) : {};

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsed);
            return;
          }

          reject(
            new Error(
              parsed.message ||
                parsed.error ||
                `Resend respondio con estado ${response.statusCode}`
            )
          );
        });
      }
    );

    request.on('error', reject);
    request.write(JSON.stringify(payload));
    request.end();
  });
}

async function sendEmail({ to, subject, html, text, replyTo, from }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no esta configurada');
  }

  const sender = from || getDefaultFrom();
  if (!sender) {
    throw new Error('RESEND_FROM_EMAIL no esta configurado');
  }

  const payload = {
    from: sender,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text
  };

  if (replyTo) {
    payload.reply_to = Array.isArray(replyTo) ? replyTo : [replyTo];
  }

  return sendResendRequest(payload);
}

module.exports = {
  getAdminContactEmail,
  getDefaultFrom,
  isEmailConfigured,
  sendEmail
};
