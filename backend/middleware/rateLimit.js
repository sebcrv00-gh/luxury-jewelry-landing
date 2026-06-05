const rateLimit = require('express-rate-limit');

const buildLimiter = ({
  windowMs,
  max,
  message,
  standardHeaders = true,
  legacyHeaders = false
}) => rateLimit({
  windowMs,
  max,
  standardHeaders,
  legacyHeaders,
  message: { error: message },
  skipSuccessfulRequests: false
});

const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: 'Demasiados intentos de autenticacion. Intenta nuevamente en unos minutos.'
});

const recoveryRequestLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Has solicitado demasiados codigos de recuperacion. Espera unos minutos antes de intentar nuevamente.'
});

const recoveryVerifyLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de verificacion. Espera unos minutos antes de volver a intentar.'
});

const contactLimiter = buildLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Has enviado demasiados mensajes en poco tiempo. Espera unos minutos antes de intentarlo de nuevo.'
});

module.exports = {
  authLimiter,
  recoveryRequestLimiter,
  recoveryVerifyLimiter,
  contactLimiter
};
