const BuscarPacientesQuery = require('../../../pacientes/queries/BuscarPacientesQuery');
const BuscarCirurgiasQuery = require('../../../cirurgias/queries/BuscarCirurgiasQuery');
const ExportarCirurgiasUseCase = require('./ExportarCirurgiasUseCase');
const ExportarCirurgiasController = require('../../infra/http/controllers/ExportarCirurgiasController');

const buscarPacientesQuery = new BuscarPacientesQuery();
const buscarCirurgiasQuery = new BuscarCirurgiasQuery();
const exportarCirurgiasUseCase = new ExportarCirurgiasUseCase(buscarPacientesQuery, buscarCirurgiasQuery);
const exportarCirurgiasController = new ExportarCirurgiasController(exportarCirurgiasUseCase);

module.exports = { exportarCirurgiasController };
