const { AUTH_COOKIE_NAME } = require('./authCookie');

describe('Config: authCookie', () => {
  const NODE_ENV_ORIGINAL = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = NODE_ENV_ORIGINAL;
    jest.resetModules();
  });

  it('expõe um nome de cookie fixo', () => {
    expect(AUTH_COOKIE_NAME).toBe('token');
  });

  it('em produção, exige Secure e SameSite=None (frontend e backend em domínios diferentes)', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();

    const { getAuthCookieOptions } = require('./authCookie');
    const options = getAuthCookieOptions();

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe('none');
  });

  it('fora de produção, usa Lax e não exige Secure (dev local não é HTTPS)', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();

    const { getAuthCookieOptions } = require('./authCookie');
    const options = getAuthCookieOptions();

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe('lax');
  });
});
