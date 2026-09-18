const PacienteModel = require('../../infra/database/mongoose/PacienteSchema');
const PacienteRepository = require('../../infra/repositories/PacienteRepository');
const CriarPacienteUseCase = require('./CriarPacienteUseCase');
const CriarPacienteController = require('../../infra/http/controllers/CriarPacienteController');

const pacienteRepository = new PacienteRepository(PacienteModel);

const criarPacienteUseCase = new CriarPacienteUseCase(pacienteRepository);

const criarPacienteController = new CriarPacienteController(criarPacienteUseCase);

module.exports = { criarPacienteController };
