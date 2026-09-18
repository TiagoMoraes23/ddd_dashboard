const jwt = require('jsonwebtoken');
const ensureAuthenticated = require('./ensureAuthenticated');
const { JWT_SECRET } = require('../../../config/jwt');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Middleware: ensureAuthenticated', () => {
  it('deve chamar next() e popular req.user quando o cookie token é válido', () => {
    const token = jwt.sign({ id: '1', username: 'tiago', role: 'admin' }, JWT_SECRET);
    const req = { cookies: { token } };
    const res = mockRes();
    const next = jest.fn();

    ensureAuthenticated(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: '1', username: 'tiago', role: 'admin' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando não há cookies na requisição', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    ensureAuthenticated(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando o cookie token não está presente', () => {
    const req = { cookies: {} };
    const res = mockRes();
    const next = jest.fn();

    ensureAuthenticated(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando o token é inválido ou expirado', () => {
    const tokenExpirado = jwt.sign({ id: '1' }, JWT_SECRET, { expiresIn: -10 });
    const req = { cookies: { token: tokenExpirado } };
    const res = mockRes();
    const next = jest.fn();

    ensureAuthenticated(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando o token foi assinado com outro segredo', () => {
    const token = jwt.sign({ id: '1' }, 'segredo-diferente');
    const req = { cookies: { token } };
    const res = mockRes();
    const next = jest.fn();

    ensureAuthenticated(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
