const { Router } = require('express');
const { buscarPacientesController } = require('../../../queries');
const { atualizarPacienteController } = require('../../../useCases/AtualizarPaciente');
const inativarPacienteController = require('../../../useCases/InativarPaciente');
const { criarPacienteController } = require('../../../useCases/CriarPaciente');
const BuscarPacientesQuery = require('../../../queries/BuscarPacientesQuery');

const pacientesRouter = Router();
const buscarPacientesQuery = new BuscarPacientesQuery();

// Define a rota GET para buscar pacientes.
// O .bind() é crucial para garantir que o 'this' dentro do método 'handle'
// seja a instância correta de 'buscarPacientesController'.
pacientesRouter.get('/', async (req, res) => {
    try {
        const { q, fornecedor, convenio, dataCirurgia, sortBy, semCirurgias } = req.query;
        const resultados = await buscarPacientesQuery.execute({ q, fornecedor, convenio, dataCirurgia, sortBy, semCirurgias });
        return res.json(resultados);
    } catch (err) {
        return res.status(500).json({ error: "Erro interno ao processar a busca de pacientes." });
    }
});


// Define a rota POST para cadastrar um novo paciente.
pacientesRouter.post('/', criarPacienteController.handle.bind(criarPacienteController));

// Define a rota PUT para atualizar os dados de um paciente.
// O _id é passado como parâmetro na URL (não o CPF — evita CPF em texto puro
// na URL, no log de requisições e no histórico do navegador).
pacientesRouter.put('/:id', atualizarPacienteController.handle.bind(atualizarPacienteController));

// Rota para inativação (Soft Delete) de um paciente
pacientesRouter.delete(
  '/:id',
  inativarPacienteController.handle.bind(inativarPacienteController)
);

module.exports = pacientesRouter;