const { Router } = require('express');
const BuscarCirurgiasQuery = require('../../../queries/BuscarCirurgiasQuery');

// Usa try-catch no import para não quebrar a aplicação caso a IA não tenha criado estes ficheiros
let agendarCirurgiaController, atualizarStatusCirurgiaController, atualizarCirurgiaController, deletarCirurgiaController;
try {
    agendarCirurgiaController = require('../../../useCases/AgendarCirurgia').agendarCirurgiaController;
    atualizarStatusCirurgiaController = require('../../../useCases/AtualizarStatusCirurgia').atualizarStatusCirurgiaController;
    atualizarCirurgiaController = require('../../../useCases/AtualizarCirurgia').atualizarCirurgiaController;
    deletarCirurgiaController = require('../../../useCases/DeletarCirurgia').deletarCirurgiaController;
} catch (e) {
    console.warn("Aviso: Controladores de escrita não encontrados. Modo leitura ativado.");
}

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

// Rotas de Escrita
if (agendarCirurgiaController) {
    cirurgiasRouter.post('/', agendarCirurgiaController.handle.bind(agendarCirurgiaController));
}
if (atualizarStatusCirurgiaController) {
    cirurgiasRouter.patch('/:id/status', atualizarStatusCirurgiaController.handle.bind(atualizarStatusCirurgiaController));
}
if (atualizarCirurgiaController) {
    cirurgiasRouter.put('/:id', atualizarCirurgiaController.handle.bind(atualizarCirurgiaController));
}
if (deletarCirurgiaController) {
    cirurgiasRouter.delete('/:id', deletarCirurgiaController.handle.bind(deletarCirurgiaController));
}

module.exports = cirurgiasRouter;