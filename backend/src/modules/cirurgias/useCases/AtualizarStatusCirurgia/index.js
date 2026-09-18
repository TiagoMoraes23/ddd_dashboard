const CirurgiaRepository = require('../../infra/repositories/CirurgiaRepository');
const AtualizarStatusCirurgiaUseCase = require('./AtualizarStatusCirurgiaUseCase');
const AtualizarStatusCirurgiaController = require('../../infra/http/controllers/AtualizarStatusCirurgiaController');

const cirurgiaRepository = new CirurgiaRepository();

const atualizarStatusCirurgiaUseCase = new AtualizarStatusCirurgiaUseCase(cirurgiaRepository);

const atualizarStatusCirurgiaController = new AtualizarStatusCirurgiaController(atualizarStatusCirurgiaUseCase);

module.exports = { atualizarStatusCirurgiaController };
