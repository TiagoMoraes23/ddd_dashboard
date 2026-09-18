// Assumimos que o repositório concreto está na camada de infraestrutura.
// A sua instanciação é centralizada aqui.
const CirurgiaRepository = require('../../infra/repositories/CirurgiaRepository');
const AtualizarStatusCirurgiaUseCase = require('./AtualizarStatusCirurgiaUseCase');
const AtualizarStatusCirurgiaController = require('../../infra/http/controllers/AtualizarStatusCirurgiaController');

// 1. Instancia o Repositório.
const cirurgiaRepository = new CirurgiaRepository();

// 2. Instancia o Caso de Uso, injetando o repositório.
const atualizarStatusCirurgiaUseCase = new AtualizarStatusCirurgiaUseCase(cirurgiaRepository);

// 3. Instancia o Controller, injetando o caso de uso.
const atualizarStatusCirurgiaController = new AtualizarStatusCirurgiaController(atualizarStatusCirurgiaUseCase);

module.exports = { atualizarStatusCirurgiaController };
