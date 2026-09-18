const BuscarPacientesQuery = require('./BuscarPacientesQuery');
const BuscarPacientesController = require('../infra/http/controllers/BuscarPacientesController');

// 1. Instancia a Query de leitura.
const buscarPacientesQuery = new BuscarPacientesQuery();

// 2. Instancia o Controller, injetando a Query como dependência (Injeção de Dependência via construtor).
const buscarPacientesController = new BuscarPacientesController(buscarPacientesQuery);

// 3. Exporta a instância do controller pronta para ser usada nas rotas.
module.exports = { buscarPacientesController };