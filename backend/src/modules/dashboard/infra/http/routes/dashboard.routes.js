const { Router } = require('express');
const { obterEstatisticasController, buscarPacientesPorKpiController } = require('../../../queries');

const router = Router();

router.get('/stats', obterEstatisticasController.handle.bind(obterEstatisticasController));
router.get('/kpi/:kpiName', buscarPacientesPorKpiController.handle.bind(buscarPacientesPorKpiController));

module.exports = router;