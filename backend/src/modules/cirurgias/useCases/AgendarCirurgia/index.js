const CirurgiaRepository = require('../../infra/repositories/CirurgiaRepository');
const VerificadorConflitoDomainService = require('../../domain/VerificadorConflitoDomainService');
const AgendarCirurgiaUseCase = require('./AgendarCirurgiaUseCase');
const AgendarCirurgiaController = require('../../infra/http/controllers/AgendarCirurgiaController');

/**
 * Factory para a criação e injeção de dependências do caso de uso "Agendar Cirurgia".
 * Este padrão centraliza a criação de objetos, facilitando a manutenção e a testabilidade.
 */
const cirurgiaRepository = new CirurgiaRepository();

const verificadorConflito = new VerificadorConflitoDomainService(
  cirurgiaRepository
);

const agendarCirurgiaUseCase = new AgendarCirurgiaUseCase(
  cirurgiaRepository,
  verificadorConflito
);

const agendarCirurgiaController = new AgendarCirurgiaController(
  agendarCirurgiaUseCase
);

module.exports = { agendarCirurgiaController };