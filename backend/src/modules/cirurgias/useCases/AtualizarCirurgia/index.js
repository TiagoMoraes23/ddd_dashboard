const CirurgiaRepository = require('../../infra/repositories/CirurgiaRepository');
const AtualizarCirurgiaUseCase = require('./AtualizarCirurgiaUseCase');
const AtualizarCirurgiaController = require('../../infra/http/controllers/AtualizarCirurgiaController');

const cirurgiaRepository = new CirurgiaRepository();
const atualizarCirurgiaUseCase = new AtualizarCirurgiaUseCase(cirurgiaRepository);
const atualizarCirurgiaController = new AtualizarCirurgiaController(atualizarCirurgiaUseCase);

module.exports = { atualizarCirurgiaController };
