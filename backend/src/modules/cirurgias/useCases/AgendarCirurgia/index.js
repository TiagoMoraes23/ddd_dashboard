const CirurgiaRepository = require('../../infra/repositories/CirurgiaRepository');
const VerificadorConflitoDomainService = require('../../domain/VerificadorConflitoDomainService');
const AgendarCirurgiaUseCase = require('./AgendarCirurgiaUseCase');
const AgendarCirurgiaController = require('../../infra/http/controllers/AgendarCirurgiaController');

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