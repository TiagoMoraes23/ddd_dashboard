const PacienteModel = require('../../pacientes/infra/database/mongoose/PacienteSchema');
const CirurgiaModel = require('../../cirurgias/infra/database/mongoose/CirurgiaSchema');
const criarEstagioLookupCirurgias = require('../../../shared/utils/criarEstagioLookupCirurgias');

const KPIS_VALIDOS = [
  'autorizados',
  'agendados',
  'agendamentoPendente',
  'rnmVencidas',
  'solicitarNovaRnm',
  'reentrada',
];

/**
 * Query de drilldown: retorna os pacientes que compõem um KPI específico do
 * dashboard, para a lista "Registros Recentes" filtrada ao clicar num card.
 * Retorna sempre documentos de Paciente completos, para manter um contrato
 * único consumido pelo frontend. Cirurgias vivem na coleção standalone
 * (Fase 6) — os KPIs baseados em status de cirurgia primeiro acham os
 * `pacienteId` qualificados lá, depois buscam o Paciente completo.
 *
 * Todo ramo usa `criarEstagioLookupCirurgias()` pra sobrescrever o campo
 * `cirurgias` do paciente devolvido com o array da coleção standalone — sem
 * isso, o paciente sai com o array embutido legado (não normalizado, ex.:
 * `regiao` como string livre "Joelhos" em vez de `["Joelho"]`), como um bug
 * real encontrado no drilldown de KPI (a busca avançada/rápida, via
 * `BuscarPacientesQuery`, já fazia esse lookup corretamente).
 *
 * `pacienteId` é sempre gravado como String (`String(paciente._id)`), mas o
 * `_id` real do paciente no Mongo pode ser um ObjectId nativo (pacientes
 * legados nunca migrados fisicamente, apesar do schema declarar `String` —
 * declarar o tipo no schema não converte dado já existente). Comparação
 * direta `{_id: pacienteId}` falha nesses casos (confirmado ao vivo contra o
 * Atlas real) — mesma classe de bug já corrigida antes em
 * ObterEstatisticasDashboardQuery/BuscarPacientesPorKpiQuery (Fase 2). Por
 * isso o match usa `$toString: '$_id'`, que funciona para os dois tipos.
 */
class BuscarPacientesPorKpiQuery {
  /**
   * @param {string} kpiName - Um dos KPIS_VALIDOS.
   * @returns {Promise<Array<object>>}
   */
  async execute(kpiName) {
    if (!KPIS_VALIDOS.includes(kpiName)) {
      throw new Error(`KPI inválido: ${kpiName}`);
    }

    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

    const onzeMesesAtras = new Date();
    onzeMesesAtras.setMonth(onzeMesesAtras.getMonth() - 11);

    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

    switch (kpiName) {
      case 'autorizados':
      case 'agendados':
      case 'agendamentoPendente': {
        const statusPorKpi = {
          autorizados: 'Autorizado',
          agendados: 'Agendado',
          agendamentoPendente: 'Agendamento Pendente',
        };
        const pacienteIds = await CirurgiaModel.distinct('pacienteId', { status: statusPorKpi[kpiName] });
        return PacienteModel.aggregate([
          { $match: { $expr: { $in: [{ $toString: '$_id' }, pacienteIds] } } },
          criarEstagioLookupCirurgias(),
          { $sort: { updatedAt: -1 } },
        ]);
      }

      case 'rnmVencidas':
        return PacienteModel.aggregate([
          { $match: { dataRnm: { $lt: umAnoAtras } } },
          criarEstagioLookupCirurgias(),
          { $sort: { updatedAt: -1 } },
        ]);

      case 'solicitarNovaRnm':
        return PacienteModel.aggregate([
          { $match: { dataRnm: { $gte: umAnoAtras, $lt: onzeMesesAtras } } },
          criarEstagioLookupCirurgias(),
          { $sort: { updatedAt: -1 } },
        ]);

      case 'reentrada': {
        // Mesma regra usada em ObterEstatisticasDashboardQuery: parte da
        // coleção `cirurgias` e junta com o paciente (via $toString, ver
        // comentário da classe) só pra checar a RNM.
        const qualificados = await CirurgiaModel.aggregate([
          { $match: { status: 'Realizado', data: { $lt: tresMesesAtras } } },
          {
            $lookup: {
              from: 'pacientes',
              let: { pacienteId: '$pacienteId' },
              pipeline: [{ $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$pacienteId'] } } }],
              as: 'paciente',
            },
          },
          { $unwind: '$paciente' },
          { $match: { 'paciente.dataRnm': { $gte: umAnoAtras } } },
          { $group: { _id: '$pacienteId' } },
        ]);
        const pacienteIds = qualificados.map((r) => r._id);
        return PacienteModel.aggregate([
          { $match: { $expr: { $in: [{ $toString: '$_id' }, pacienteIds] } } },
          criarEstagioLookupCirurgias(),
          { $sort: { updatedAt: -1 } },
        ]);
      }

      default:
        // Inalcançável: já validado no topo do método.
        return [];
    }
  }
}

module.exports = BuscarPacientesPorKpiQuery;
