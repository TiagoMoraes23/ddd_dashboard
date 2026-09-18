const CirurgiaModel = require('../infra/database/mongoose/CirurgiaSchema');
const criarIntervaloDeData = require('../../../shared/utils/criarIntervaloDeData');

/**
 * Query de busca avançada de cirurgias (uma linha por cirurgia, enriquecida
 * com dados do paciente via $lookup). Extraída de cirurgias.routes.js (Fase
 * "Excel export") para ser reutilizável tanto pela rota GET /buscar quanto
 * pelo módulo de relatórios (exportação de planilha) — sem duplicar a
 * agregação em dois lugares.
 */
class BuscarCirurgiasQuery {
  async execute(filtros = {}) {
    const { q, fornecedor, status, convenio, dataCirurgia, sortBy } = filtros;

    const pipeline = [];
    const match = {};

    if (fornecedor) {
      // Correspondência EXATA, insensível a acento/maiúscula via collation
      // (ver o .collation() no aggregate abaixo) — evita tanto um fornecedor
      // curto retornando falsos positivos de outro que o contém como substring
      // quanto o mesmo fornecedor não batendo por causa de uma variação de
      // acentuação, os dois já vistos em dados reais gerados por usuários
      // diferentes ao longo do tempo.
      match.fornecedor = fornecedor;
    }
    if (status) {
      match.status = status;
    }
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    // Filtro por período da cirurgia (dd/mm/aaaa, mm/aaaa ou aaaa). `data`
    // já é Date de verdade na coleção standalone, sem precisar de $toDate.
    if (dataCirurgia) {
      const [inicio, fim] = criarIntervaloDeData(dataCirurgia);
      if (inicio && fim) {
        pipeline.push({ $match: { data: { $ne: null, $gte: inicio, $lte: fim } } });
      }
    }

    // Junta com o paciente pra expor nome/cpf/convênio/fornecedor atual e
    // permitir a busca livre (q) e o filtro de convênio nesses campos. Usa
    // $toString no join: `pacienteId` é sempre String, mas o `_id` do
    // paciente pode ser um ObjectId nativo (pacientes legados nunca
    // migrados fisicamente) — confirmado ao vivo contra o Atlas real que
    // um localField/foreignField direto não bate nesses casos.
    pipeline.push({
      $lookup: {
        from: 'pacientes',
        let: { pacienteId: '$pacienteId' },
        pipeline: [{ $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$pacienteId'] } } }],
        as: 'paciente',
      },
    });
    pipeline.push({ $unwind: '$paciente' });

    const matchPosJoin = {};
    if (convenio) {
      matchPosJoin['paciente.convenio'] = { $regex: convenio, $options: 'i' };
    }
    if (q) {
      matchPosJoin['$or'] = [
        { 'paciente.nome': { $regex: q, $options: 'i' } },
        { 'paciente.cpf': { $regex: q, $options: 'i' } },
        { 'paciente.convenio': { $regex: q, $options: 'i' } },
        { fornecedor: { $regex: q, $options: 'i' } },
      ];
    }
    if (Object.keys(matchPosJoin).length > 0) {
      pipeline.push({ $match: matchPosJoin });
    }

    pipeline.push({
      $project: {
        _id: '$_id',
        pacienteNome: '$paciente.nome',
        pacienteCpf: '$paciente.cpf',
        pacienteConvenio: '$paciente.convenio',
        pacienteFornecedor: '$paciente.fornecedor',
        // Campos de nível-paciente usados pela exportação de planilha (uma
        // linha por paciente) — a rota /buscar (uma linha por cirurgia) os
        // ignora, mas vêm de graça do $lookup acima, sem custo extra.
        pacienteDataRnm: '$paciente.dataRnm',
        pacienteUltimosFornecedores: '$paciente.ultimosFornecedores',
        descricao: '$descricao',
        fornecedor: '$fornecedor',
        status: '$status',
        data: '$data',
        horario: '$horario',
        hospital: '$hospital',
        regiao: '$regiao',
        opme: '$opme',
      },
    });

    pipeline.push({ $sort: sortBy === 'data_asc' ? { data: 1 } : { data: -1 } });

    // strength: 1 faz a comparação exata de `fornecedor` acima ignorar
    // maiúscula/minúscula e acento — não afeta "q"/"convenio" (regex) nem
    // o $sort por data (campo Date, não string).
    const resultados = await CirurgiaModel.aggregate(pipeline).collation({ locale: 'pt', strength: 1 });

    // `fornecedor` do paciente é array (pode ter mais de um fornecedor
    // atual simultâneo) — a tabela de busca espera uma string.
    resultados.forEach((r) => {
      if (Array.isArray(r.pacienteFornecedor)) {
        r.pacienteFornecedor = r.pacienteFornecedor.join(', ');
      }
    });

    return resultados;
  }
}

module.exports = BuscarCirurgiasQuery;
