const PacienteModel = require('../../infra/database/mongoose/PacienteSchema');
const PacienteRepository = require('../../infra/repositories/PacienteRepository');
const AtualizarPacienteUseCase = require('./AtualizarPacienteUseCase');
const AtualizarPacienteController = require('../../infra/http/controllers/AtualizarPacienteController');

const pacienteRepository = new PacienteRepository(PacienteModel);

const atualizarPacienteUseCase = new AtualizarPacienteUseCase(pacienteRepository);

const atualizarPacienteController = new AtualizarPacienteController(atualizarPacienteUseCase);

module.exports = { atualizarPacienteController };