const crypto = require('crypto');

const SIMPLE_CAPTCHA_TTL_MS = 5 * 60 * 1000;
const SIMPLE_CAPTCHA_SECRET = String(
  process.env.SIMPLE_CAPTCHA_SECRET ||
  process.env.SESSION_SECRET ||
  'luxury-jewelry-simple-captcha'
).trim();

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function signPayload(payload) {
  return crypto.createHmac('sha256', SIMPLE_CAPTCHA_SECRET).update(payload).digest('hex');
}

function buildChallenge() {
  const operators = ['+', '-'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let left = Math.floor(Math.random() * 9) + 1;
  let right = Math.floor(Math.random() * 9) + 1;

  if (operator === '-' && right > left) {
    [left, right] = [right, left];
  }

  const answer = operator === '+' ? left + right : left - right;

  return {
    prompt: `Resuelve: ${left} ${operator} ${right}`,
    answer
  };
}

function createSimpleCaptcha(action = 'auth') {
  const challenge = buildChallenge();
  const payload = JSON.stringify({
    action,
    answer: String(challenge.answer),
    nonce: crypto.randomBytes(8).toString('hex'),
    expiresAt: Date.now() + SIMPLE_CAPTCHA_TTL_MS
  });

  return {
    prompt: challenge.prompt,
    token: `${toBase64Url(payload)}.${signPayload(payload)}`
  };
}

function verifySimpleCaptcha({ token, answer, action }) {
  if (!token || String(token).trim() === '') {
    return { success: false, error: 'missing-token' };
  }

  if (answer === undefined || String(answer).trim() === '') {
    return { success: false, error: 'missing-answer' };
  }

  const [encodedPayload, signature] = String(token).split('.');
  if (!encodedPayload || !signature) {
    return { success: false, error: 'invalid-token' };
  }

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload));
  } catch {
    return { success: false, error: 'invalid-token' };
  }

  const rawPayload = JSON.stringify(payload);
  const expectedSignature = signPayload(rawPayload);

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return { success: false, error: 'invalid-token' };
  }

  if (payload.expiresAt < Date.now()) {
    return { success: false, error: 'expired' };
  }

  if (action && payload.action !== action) {
    return { success: false, error: 'invalid-action' };
  }

  if (String(payload.answer) !== String(answer).trim()) {
    return { success: false, error: 'wrong-answer' };
  }

  return { success: true };
}

function formatSimpleCaptchaError(errorCode) {
  switch (errorCode) {
    case 'missing-token':
    case 'missing-answer':
      return 'Completa el captcha de seguridad antes de continuar.';
    case 'expired':
      return 'El captcha expiró. Recárgalo e inténtalo nuevamente.';
    case 'wrong-answer':
      return 'La respuesta del captcha no es correcta.';
    case 'invalid-action':
    case 'invalid-token':
    default:
      return 'No fue posible validar el captcha. Recárgalo e inténtalo nuevamente.';
  }
}

module.exports = {
  createSimpleCaptcha,
  verifySimpleCaptcha,
  formatSimpleCaptchaError
};
