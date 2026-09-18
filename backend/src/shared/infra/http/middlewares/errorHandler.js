const logger = require('../../../config/logger');

// Rede de segurança para qualquer erro que escape do try/catch de um
// controller (ex: exceção síncrona inesperada) — sem isso, o Express usa seu
// handler de erro padrão, que vaza stack trace pro cliente e não loga nada
// de forma estruturada. Precisa dos 4 argumentos: é assim que o Express
// identifica um error handler.
function errorHandler(err, req, res, next) {
  logger.error({ err, path: req.path, method: req.method }, 'Erro não tratado na requisição.');

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.statusCode || 500).json({
    message: err.statusCode ? err.message : 'Erro interno do servidor.',
  });
}

module.exports = errorHandler;
