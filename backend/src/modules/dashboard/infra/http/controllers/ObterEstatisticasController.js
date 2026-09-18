/**
 * Controlador HTTP para expor os dados da query de estatísticas.
 */
class ObterEstatisticasController {
  /**
   * @param {ObterEstatisticasDashboardQuery} obterEstatisticasQuery - A instância do serviço de query.
   */
  constructor(obterEstatisticasQuery) {
    if (!obterEstatisticasQuery) {
      throw new Error('A dependência obterEstatisticasQuery é obrigatória.');
    }
    this.obterEstatisticasQuery = obterEstatisticasQuery;
  }

  /**
   * Lida com a requisição HTTP, executa a query e retorna os dados.
   * @param {object} request - O objeto de requisição do Express.
   * @param {object} response - O objeto de resposta do Express.
   */
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