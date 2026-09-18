const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../../config/jwt');
const { AUTH_COOKIE_NAME } = require('../../../config/authCookie');

function ensureAuthenticated(req, res, next) {
  // Token vem só do cookie httpOnly (setado no login) — nunca mais de um
  // header Authorization, que exigiria o token acessível a JavaScript.
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

module.exports = ensureAuthenticated;
