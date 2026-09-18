const CirurgiaRepository = require('../../infra/repositories/CirurgiaRepository');
const DeletarCirurgiaUseCase = require('./DeletarCirurgiaUseCase');
const DeletarCirurgiaController = require('../../infra/http/controllers/DeletarCirurgiaController');

const cirurgiaRepository = new CirurgiaRepository();
const deletarCirurgiaUseCase = new DeletarCirurgiaUseCase(cirurgiaRepository);
const deletarCirurgiaController = new DeletarCirurgiaController(deletarCirurgiaUseCase);

module.exports = { deletarCirurgiaController };
