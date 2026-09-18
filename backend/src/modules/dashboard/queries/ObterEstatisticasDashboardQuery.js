const PacienteModel = require('../../pacientes/infra/database/mongoose/PacienteSchema');
const CirurgiaModel = require('../../cirurgias/infra/database/mongoose/CirurgiaSchema');

class ObterEstatisticasDashboardQuery {
  async execute() {
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

    const onzeMesesAtras = new Date();
    onzeMesesAtras.setMonth(onzeMesesAtras.getMonth() - 11);

    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

    const [
      contagemCirurgias,
      rnmVencidas,
      solicitarNovaRnm,
      reentradaResult,
    ] = await Promise.all([
      CirurgiaModel.aggregate([
        {
          $group: {
            _id: null,
            autorizados: { $sum: { $cond: [{ $eq: ['$status', 'Autorizado'] }, 1, 0] } },
            agendados: { $sum: { $cond: [{ $eq: ['$status', 'Agendado'] }, 1, 0] } },
            agendamentoPendente: { $sum: { $cond: [{ $eq: ['$status', 'Agendamento Pendente'] }, 1, 0] } },
          },
        },
      ]),
      PacienteModel.countDocuments({ dataRnm: { $lt: umAnoAtras } }),
      PacienteModel.countDocuments({ dataRnm: { $gte: umAnoAtras, $lt: onzeMesesAtras } }),
      // Reentrada: paciente com RNM não vencida e ao menos uma cirurgia "Realizado"
      // há mais de 3 meses.
      // O join usa $toString porque `cirurgia.pacienteId` é sempre String,
      // mas o `_id` do paciente pode ser um ObjectId nativo (pacientes
      // legados nunca migrados fisicamente, apesar do schema declarar
      // `String` — o schema não converte dado já existente). Um
      // `localField`/`foreignField` direto não bate nesses casos.
      CirurgiaModel.aggregate([
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
        { $count: 'total' },
      ]),
    ]);

    const kpis = contagemCirurgias[0] || { autorizados: 0, agendados: 0, agendamentoPendente: 0 };

    return {
      autorizados: kpis.autorizados || 0,
      agendados: kpis.agendados || 0,
      agendamentoPendente: kpis.agendamentoPendente || 0,
      rnmVencidas,
      solicitarNovaRnm,
      reentrada: reentradaResult[0]?.total || 0,
    };
  }
}

module.exports = ObterEstatisticasDashboardQuery;
