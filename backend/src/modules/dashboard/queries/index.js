const ObterEstatisticasDashboardQuery = require('./ObterEstatisticasDashboardQuery');
const ObterEstatisticasController = require('../infra/http/controllers/ObterEstatisticasController');
const BuscarPacientesPorKpiQuery = require('./BuscarPacientesPorKpiQuery');
const BuscarPacientesPorKpiController = require('../infra/http/controllers/BuscarPacientesPorKpiController');

const obterEstatisticasDashboardQuery = new ObterEstatisticasDashboardQuery();
const buscarPacientesPorKpiQuery = new BuscarPacientesPorKpiQuery();

const obterEstatisticasController = new ObterEstatisticasController(obterEstatisticasDashboardQuery);
const buscarPacientesPorKpiController = new BuscarPacientesPorKpiController(buscarPacientesPorKpiQuery);

module.exports = { obterEstatisticasController, buscarPacientesPorKpiController };
