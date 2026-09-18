/**
 * Controlador HTTP para a busca de pacientes utilizando uma query otimizada.
 */
class BuscarPacientesController {
  /**
   * @param {import('../../../queries/BuscarPacientesQuery')} buscarPacientesQuery - A instância do serviço de query.
   */
  constructor(buscarPacientesQuery) {
    if (!buscarPacientesQuery || typeof buscarPacientesQuery.execute !== 'function') {
      throw new Error('A dependência buscarPacientesQuery (com o método execute) é obrigatória.');
    }
    this.buscarPacientesQuery = buscarPacientesQuery;
  }

  /**
   * Lida com a requisição HTTP, executa a query de busca e retorna os dados.
   * @param {object} request - O objeto de requisição do Express.
   * @param {object} response - O objeto de resposta do Express.
   */
  async handle(request, response) {
    try {
      const { q, fornecedor, sortBy } = request.query;

      const pacientes = await this.buscarPacientesQuery.execute({ q, fornecedor, sortBy });

      return response.status(200).json(pacientes);
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      return response.status(500).json({ message: 'Ocorreu um erro interno ao processar a sua solicitação.' });
    }
  }
}

module.exports = BuscarPacientesController;