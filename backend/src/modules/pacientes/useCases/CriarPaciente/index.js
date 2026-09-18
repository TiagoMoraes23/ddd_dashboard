const PacienteModel = require('../../infra/database/mongoose/PacienteSchema');
const PacienteRepository = require('../../infra/repositories/PacienteRepository');
const CriarPacienteUseCase = require('./CriarPacienteUseCase');
const CriarPacienteController = require('../../infra/http/controllers/CriarPacienteController');

// 1. Instancia o Repositório, injetando o Model do Mongoose.
const pacienteRepository = new PacienteRepository(PacienteModel);

// 2. Instancia o Caso de Uso, injetando o repositório.
const criarPacienteUseCase = new CriarPacienteUseCase(pacienteRepository);

// 3. Instancia o Controller, injetando o caso de uso.
const criarPacienteController = new CriarPacienteController(criarPacienteUseCase);

module.exports = { criarPacienteController };
