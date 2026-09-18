const { AUTH_COOKIE_NAME, getAuthCookieOptions } = require('../../../../../shared/config/authCookie');

class AutenticarUsuarioController {
  constructor(autenticarUsuarioUseCase) {
    this.autenticarUsuarioUseCase = autenticarUsuarioUseCase;
  }

  async handle(req, res) {
    const { username, password } = req.body;

    try {
      const { usuario, token } = await this.autenticarUsuarioUseCase.execute({ username, password });
      res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
      return res.status(200).json({ usuario });
    } catch (error) {
      return res.status(401).json({ message: error.message });
    }
  }
}

module.exports = AutenticarUsuarioController;