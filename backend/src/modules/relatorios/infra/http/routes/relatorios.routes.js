const { Router } = require('express');
const ensureAdmin = require('../../../../../shared/infra/http/middlewares/ensureAdmin');
const { exportarCirurgiasController } = require('../../../useCases/ExportarCirurgias');

const relatoriosRouter = Router();

relatoriosRouter.use(ensureAdmin);

relatoriosRouter.get('/cirurgias/exportar', exportarCirurgiasController.handle.bind(exportarCirurgiasController));

module.exports = relatoriosRouter;
