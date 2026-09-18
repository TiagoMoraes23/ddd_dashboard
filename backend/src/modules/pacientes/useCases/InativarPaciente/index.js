const PacienteModel = require('../../infra/database/mongoose/PacienteSchema');
const PacienteRepository = require('../../infra/repositories/PacienteRepository');
const InativarPacienteUseCase = require('./InativarPacienteUseCase');
const InativarPacienteController = require('../../infra/http/controllers/InativarPacienteController');

const pacienteRepository = new PacienteRepository(PacienteModel);

const inativarPacienteUseCase = new InativarPacienteUseCase(pacienteRepository);

const inativarPacienteController = new InativarPacienteController(inativarPacienteUseCase);

module.exports = inativarPacienteController;