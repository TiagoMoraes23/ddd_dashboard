describe('Config: jwt', () => {
  const JWT_SECRET_ORIGINAL = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = JWT_SECRET_ORIGINAL;
    jest.resetModules();
  });

  it('deve lançar erro ao carregar sem JWT_SECRET definido no ambiente', () => {
    delete process.env.JWT_SECRET;
    jest.resetModules();

    expect(() => require('./jwt')).toThrow('JWT_SECRET não definido');
  });

  it('deve expor o segredo do ambiente quando definido', () => {
    process.env.JWT_SECRET = 'segredo-de-teste';
    jest.resetModules();

    const { JWT_SECRET } = require('./jwt');
    expect(JWT_SECRET).toBe('segredo-de-teste');
  });
});
