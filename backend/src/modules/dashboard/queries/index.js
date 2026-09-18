const ObterEstatisticasDashboardQuery = require('./ObterEstatisticasDashboardQuery');
const ObterEstatisticasController = require('../infra/http/controllers/ObterEstatisticasController');
const BuscarPacientesPorKpiQuery = require('./BuscarPacientesPorKpiQuery');
const BuscarPacientesPorKpiController = require('../infra/http/controllers/BuscarPacientesPorKpiController');

// 1. Instancia as Queries de leitura.
const obterEstatisticasDashboardQuery = new ObterEstatisticasDashboardQuery();
const buscarPacientesPorKpiQuery = new BuscarPacientesPorKpiQuery();

// 2. Instancia os Controllers, injetando as Queries como dependência.
const obterEstatisticasController = new ObterEstatisticasController(obterEstatisticasDashboardQuery);
const buscarPacientesPorKpiController = new BuscarPacientesPorKpiController(buscarPacientesPorKpiQuery);

// 3. Exporta as instâncias dos controllers prontas para uso nas rotas.
module.exports = { obterEstatisticasController, buscarPacientesPorKpiController };
