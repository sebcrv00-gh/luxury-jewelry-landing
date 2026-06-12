const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function isTurnstileEnabled() {
  return Boolean(String(process.env.TURNSTILE_SECRET_KEY || '').trim());
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || undefined;
}

async function verifyTurnstileToken({ token, action, req }) {
  if (!isTurnstileEnabled()) {
    return { enabled: false, success: true, errors: [] };
  }

  if (!token) {
    return { enabled: true, success: false, errors: ['missing-input-response'] };
  }

  const body = new URLSearchParams();
  body.set('secret', String(process.env.TURNSTILE_SECRET_KEY || '').trim());
  body.set('response', token);

  const remoteIp = getClientIp(req);
  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    throw new Error('No fue posible validar el captcha de seguridad en este momento.');
  }

  const data = await response.json();
  const errors = Array.isArray(data['error-codes']) ? data['error-codes'] : [];
  const actionMatches = !action || !data.action || data.action === action;

  return {
    enabled: true,
    success: Boolean(data.success) && actionMatches,
    errors: actionMatches ? errors : [...errors, 'invalid-action'],
    hostname: data.hostname || null,
    challengeTs: data.challenge_ts || null
  };
}

function formatTurnstileError(errors = []) {
  if (errors.includes('missing-input-response')) {
    return 'Completa la verificación de seguridad antes de continuar.';
  }

  if (errors.includes('timeout-or-duplicate')) {
    return 'La verificación de seguridad expiró. Vuelve a completarla e intenta nuevamente.';
  }

  if (errors.includes('invalid-action')) {
    return 'La verificación de seguridad no coincide con la acción solicitada.';
  }

  if (errors.includes('invalid-input-secret') || errors.includes('missing-input-secret')) {
    return 'El captcha de seguridad no está configurado correctamente en el servidor.';
  }

  return 'No fue posible validar la verificación de seguridad. Intenta nuevamente.';
}

module.exports = {
  isTurnstileEnabled,
  verifyTurnstileToken,
  formatTurnstileError
};
