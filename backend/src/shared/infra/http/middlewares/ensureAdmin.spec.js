const ensureAdmin = require('./ensureAdmin');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Middleware: ensureAdmin', () => {
  it('deve chamar next() quando req.user.role é "admin"', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();

    ensureAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('deve retornar 403 quando req.user.role não é "admin"', () => {
    const req = { user: { role: 'padrao' } };
    const res = mockRes();
    const next = jest.fn();

    ensureAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('deve retornar 403 quando req.user não existe (ensureAuthenticated não rodou antes)', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    ensureAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
