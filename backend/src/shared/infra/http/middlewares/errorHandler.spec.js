jest.mock('../../../config/logger', () => ({
  error: jest.fn(),
}));

const logger = require('../../../config/logger');
const errorHandler = require('./errorHandler');

function mockRes() {
  const res = { headersSent: false };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Middleware: errorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve responder 500 com mensagem genérica para um erro sem statusCode (não vaza detalhe interno)', () => {
    const err = new Error('detalhe interno sensível do banco de dados');
    const req = { path: '/api/v2/pacientes', method: 'GET' };
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno do servidor.' });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err, path: '/api/v2/pacientes', method: 'GET' }),
      expect.any(String)
    );
  });

  it('deve respeitar statusCode e message customizados quando o erro os fornecer', () => {
    const err = new Error('Recurso não encontrado.');
    err.statusCode = 404;
    const req = { path: '/api/v2/pacientes/123', method: 'GET' };
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Recurso não encontrado.' });
  });

  it('deve delegar para o next(err) se a resposta já tiver sido enviada', () => {
    const err = new Error('erro tardio');
    const req = { path: '/api/v2/pacientes', method: 'GET' };
    const res = mockRes();
    res.headersSent = true;
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
