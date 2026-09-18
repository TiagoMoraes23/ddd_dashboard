const { AUTH_COOKIE_NAME, getAuthCookieOptions } = require('../../../../../shared/config/authCookie');

// Sem caso de uso: não há regra de negócio, só limpar o cookie httpOnly, que
// só o backend consegue fazer (JavaScript do navegador não tem acesso a ele).
class LogoutController {
  handle(req, res) {
    // maxAge não se aplica a clearCookie (deprecado desde o Express 4.x
    // recente) — só httpOnly/secure/sameSite precisam bater com o cookie
    // original pro navegador reconhecer e limpar o mesmo cookie.
    const { maxAge, ...opcoesParaLimpar } = getAuthCookieOptions();
    res.clearCookie(AUTH_COOKIE_NAME, opcoesParaLimpar);
    return res.status(200).json({ message: 'Logout realizado com sucesso.' });
  }
}

module.exports = new LogoutController();
