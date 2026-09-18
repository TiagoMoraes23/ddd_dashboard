const PacienteModel = require('../../infra/database/mongoose/PacienteSchema');
const PacienteRepository = require('../../infra/repositories/PacienteRepository');
const AtualizarPacienteUseCase = require('./AtualizarPacienteUseCase');
const AtualizarPacienteController = require('../../infra/http/controllers/AtualizarPacienteController');

// 1. Instancia o Repositório.
const pacienteRepository = new PacienteRepository(PacienteModel);

// 2. Instancia o Caso de Uso, injetando o repositório.
const atualizarPacienteUseCase = new AtualizarPacienteUseCase(pacienteRepository);

// 3. Instancia o Controller, injetando o caso de uso.
const atualizarPacienteController = new AtualizarPacienteController(atualizarPacienteUseCase);

module.exports = { atualizarPacienteController };