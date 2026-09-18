const { corsOriginHandler } = require('./cors');

describe('Config: cors — FRONTEND_URL opcional', () => {
  const FRONTEND_URL_ORIGINAL = process.env.FRONTEND_URL;

  afterEach(() => {
    process.env.FRONTEND_URL = FRONTEND_URL_ORIGINAL;
    jest.resetModules();
  });

  it('deve aceitar uma origem extra quando FRONTEND_URL estiver definida', () => {
    process.env.FRONTEND_URL = 'https://staging.exemplo.com';
    jest.resetModules();

    const { corsOriginHandler: handlerComExtra } = require('./cors');
    const callback = jest.fn();
    handlerComExtra('https://staging.exemplo.com', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });
});

describe('Config: cors', () => {
  it('deve permitir requisições sem header Origin (curl, health checks)', () => {
    const callback = jest.fn();
    corsOriginHandler(undefined, callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('deve permitir a origem de desenvolvimento (localhost:5173)', () => {
    const callback = jest.fn();
    corsOriginHandler('http://localhost:5173', callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('deve recusar uma origem desconhecida', () => {
    const callback = jest.fn();
    corsOriginHandler('https://site-malicioso.com', callback);
    expect(callback).toHaveBeenCalledWith(expect.any(Error));
  });
});
