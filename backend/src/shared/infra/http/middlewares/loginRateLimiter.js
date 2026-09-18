const rateLimit = require('express-rate-limit');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Muitas tentativas de login. Por segurança, aguarde 15 minutos antes de tentar novamente.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = loginRateLimiter;
