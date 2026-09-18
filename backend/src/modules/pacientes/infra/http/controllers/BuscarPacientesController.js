class BuscarPacientesController {
  constructor(buscarPacientesQuery) {
    if (!buscarPacientesQuery || typeof buscarPacientesQuery.execute !== 'function') {
      throw new Error('A dependência buscarPacientesQuery (com o método execute) é obrigatória.');
    }
    this.buscarPacientesQuery = buscarPacientesQuery;
  }

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