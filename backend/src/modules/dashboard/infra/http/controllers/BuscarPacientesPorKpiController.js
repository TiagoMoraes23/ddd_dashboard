/**
 * Controlador HTTP para o drilldown de um KPI específico do dashboard.
 */
class BuscarPacientesPorKpiController {
  /**
   * @param {BuscarPacientesPorKpiQuery} buscarPacientesPorKpiQuery
   */
  constructor(buscarPacientesPorKpiQuery) {
    if (!buscarPacientesPorKpiQuery) {
      throw new Error('A dependência buscarPacientesPorKpiQuery é obrigatória.');
    }
    this.buscarPacientesPorKpiQuery = buscarPacientesPorKpiQuery;
  }

  async handle(request, response) {
    try {
      const { kpiName } = request.params;
      const pacientes = await this.buscarPacientesPorKpiQuery.execute(kpiName);
      return response.status(200).json(pacientes);
    } catch (error) {
      if (error.message.startsWith('KPI inválido')) {
        return response.status(400).json({ message: error.message });
      }
      console.error('Erro ao buscar pacientes por KPI:', error);
      return response.status(500).json({ message: 'Ocorreu um erro interno ao processar a sua solicitação.' });
    }
  }
}

module.exports = BuscarPacientesPorKpiController;
