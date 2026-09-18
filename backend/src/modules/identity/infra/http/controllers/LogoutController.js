const { AUTH_COOKIE_NAME, getAuthCookieOptions } = require('../../../../../shared/config/authCookie');
class LogoutController {
  handle(req, res) {
        const { maxAge, ...opcoesParaLimpar } = getAuthCookieOptions();
    res.clearCookie(AUTH_COOKIE_NAME, opcoesParaLimpar);
    return res.status(200).json({ message: 'Logout realizado com sucesso.' });
  }
}

module.exports = new LogoutController();
