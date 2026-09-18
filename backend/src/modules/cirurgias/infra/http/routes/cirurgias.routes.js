const { Router } = require('express');
const BuscarCirurgiasQuery = require('../../../queries/BuscarCirurgiasQuery');
const { agendarCirurgiaController } = require('../../../useCases/AgendarCirurgia');
const { atualizarStatusCirurgiaController } = require('../../../useCases/AtualizarStatusCirurgia');
const { atualizarCirurgiaController } = require('../../../useCases/AtualizarCirurgia');
const { deletarCirurgiaController } = require('../../../useCases/DeletarCirurgia');

const cirurgiasRouter = Router();
const buscarCirurgiasQuery = new BuscarCirurgiasQuery();

cirurgiasRouter.get('/buscar', async (req, res) => {
    try {
        const { q, fornecedor, status, convenio, dataCirurgia, sortBy } = req.query;
        const resultados = await buscarCirurgiasQuery.execute({ q, fornecedor, status, convenio, dataCirurgia, sortBy });
        return res.json(resultados);
    } catch (err) {
        console.error("Erro na busca avançada de cirurgias:", err);
        return res.status(500).json([]);
    }
});

cirurgiasRouter.post('/', agendarCirurgiaController.handle.bind(agendarCirurgiaController));
cirurgiasRouter.patch('/:id/status', atualizarStatusCirurgiaController.handle.bind(atualizarStatusCirurgiaController));
cirurgiasRouter.put('/:id', atualizarCirurgiaController.handle.bind(atualizarCirurgiaController));
cirurgiasRouter.delete('/:id', deletarCirurgiaController.handle.bind(deletarCirurgiaController));

module.exports = cirurgiasRouter;