/**
 * Middleware de autenticación
 */

function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Debes iniciar sesión' });
}

function isAdmin(req, res, next) {
  if (req.session && req.session.rol === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
}

module.exports = { isAuthenticated, isAdmin };
