const PacienteModel = require('../../infra/database/mongoose/PacienteSchema');
const PacienteRepository = require('../../infra/repositories/PacienteRepository');
const InativarPacienteUseCase = require('./InativarPacienteUseCase');
const InativarPacienteController = require('../../infra/http/controllers/InativarPacienteController');

// Instanciando o Repositório
const pacienteRepository = new PacienteRepository(PacienteModel);

// Instanciando o Caso de Uso e injetando o repositório
const inativarPacienteUseCase = new InativarPacienteUseCase(pacienteRepository);

// Instanciando o Controlador e injetando o caso de uso
const inativarPacienteController = new InativarPacienteController(inativarPacienteUseCase);

module.exports = inativarPacienteController;