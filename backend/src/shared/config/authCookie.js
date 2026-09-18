const isProducao = process.env.NODE_ENV === 'production';

const AUTH_COOKIE_NAME = 'token';

/**
 * Frontend e backend são domínios diferentes em produção — cross-site de
 * verdade, não só cross-port. Cookie cross-site só é enviado pelo navegador
 * com SameSite=None, que por sua vez exige Secure (HTTPS). Em dev, frontend
 * e backend são portas diferentes da mesma origem (localhost), então Lax já
 * basta e não depende de HTTPS local.
 */
function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: isProducao,
    sameSite: isProducao ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // mantém em sincronia manual com JWT_EXPIRES_IN ('1d') em shared/config/jwt.js
  };
}

module.exports = { AUTH_COOKIE_NAME, getAuthCookieOptions };
