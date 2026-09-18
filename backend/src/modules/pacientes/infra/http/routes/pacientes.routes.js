const { Router } = require('express');
const { buscarPacientesController } = require('../../../queries');
const { atualizarPacienteController } = require('../../../useCases/AtualizarPaciente');
const inativarPacienteController = require('../../../useCases/InativarPaciente');
const { criarPacienteController } = require('../../../useCases/CriarPaciente');
const BuscarPacientesQuery = require('../../../queries/BuscarPacientesQuery');

const pacientesRouter = Router();
const buscarPacientesQuery = new BuscarPacientesQuery();

pacientesRouter.get('/', async (req, res) => {
    try {
        const { q, fornecedor, convenio, dataCirurgia, sortBy, semCirurgias } = req.query;
        const resultados = await buscarPacientesQuery.execute({ q, fornecedor, convenio, dataCirurgia, sortBy, semCirurgias });
        return res.json(resultados);
    } catch (err) {
        return res.status(500).json({ error: "Erro interno ao processar a busca de pacientes." });
    }
});

pacientesRouter.post('/', criarPacienteController.handle.bind(criarPacienteController));
pacientesRouter.put('/:id', atualizarPacienteController.handle.bind(atualizarPacienteController));
pacientesRouter.delete(
  '/:id',
  inativarPacienteController.handle.bind(inativarPacienteController)
);

module.exports = pacientesRouter;