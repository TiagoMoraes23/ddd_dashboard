const { AUTH_COOKIE_NAME, getAuthCookieOptions } = require('../../../../../shared/config/authCookie');

class AutenticarUsuarioController {
  constructor(autenticarUsuarioUseCase) {
    this.autenticarUsuarioUseCase = autenticarUsuarioUseCase;
  }

  async handle(req, res) {
    const { username, password } = req.body;

    try {
      const { usuario, token } = await this.autenticarUsuarioUseCase.execute({ username, password });
      // Token vai só no cookie httpOnly, nunca no corpo — JavaScript no
      // navegador não pode ler nem roubar via XSS o que nunca chega até ele.
      res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
      return res.status(200).json({ usuario });
    } catch (error) {
      // Retorna 401 para qualquer erro de autenticação, protegendo contra ataques de enumeração.
      return res.status(401).json({ message: error.message });
    }
  }
}

module.exports = AutenticarUsuarioController;