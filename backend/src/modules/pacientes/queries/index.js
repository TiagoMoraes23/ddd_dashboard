const BuscarPacientesQuery = require('./BuscarPacientesQuery');
const BuscarPacientesController = require('../infra/http/controllers/BuscarPacientesController');

const buscarPacientesQuery = new BuscarPacientesQuery();

const buscarPacientesController = new BuscarPacientesController(buscarPacientesQuery);

module.exports = { buscarPacientesController };