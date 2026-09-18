const { Router } = require('express');
const ensureAdmin = require('../../../../../shared/infra/http/middlewares/ensureAdmin');
const { exportarCirurgiasController } = require('../../../useCases/ExportarCirurgias');

const relatoriosRouter = Router();

// Exportação libera a base inteira (CPF incluído) — restrita a admins.
// ensureAuthenticated já roda antes (aplicado no server.js para todo o
// prefixo /api/v2), então req.user existe aqui.
relatoriosRouter.use(ensureAdmin);

relatoriosRouter.get('/cirurgias/exportar', exportarCirurgiasController.handle.bind(exportarCirurgiasController));

module.exports = relatoriosRouter;
