class ObterEstatisticasController {
  constructor(obterEstatisticasQuery) {
    if (!obterEstatisticasQuery) {
      throw new Error('A dependência obterEstatisticasQuery é obrigatória.');
    }
    this.obterEstatisticasQuery = obterEstatisticasQuery;
  }

  async handle(request, response) {
    try {
      const stats = await this.obterEstatisticasQuery.execute();
      return response.status(200).json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas do dashboard:', error);
      return response.status(500).json({ message: 'Ocorreu um erro interno ao processar a sua solicitação.' });
    }
  }
}

module.exports = ObterEstatisticasController;