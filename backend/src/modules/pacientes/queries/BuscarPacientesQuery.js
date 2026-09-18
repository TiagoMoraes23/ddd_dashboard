const PacienteModel = require('../infra/database/mongoose/PacienteSchema');
const criarIntervaloDeData = require('../../../shared/utils/criarIntervaloDeData');
const criarEstagioLookupCirurgias = require('../../../shared/utils/criarEstagioLookupCirurgias');

class BuscarPacientesQuery {
  async execute(filtros = {}) {
    const { q, fornecedor, convenio, dataCirurgia, sortBy, semCirurgias } = filtros;
    const pipeline = [];

    pipeline.push(criarEstagioLookupCirurgias());

    // Trata ausência do campo como ativo (pacientes legados nunca tiveram o
    // default do schema aplicado, pois foram inseridos fora do Mongoose).
    const matchConditions = { $and: [{ ativo: { $ne: false } }] };

    if (q) {
      const regex = new RegExp(q, 'i');
      matchConditions.$and.push({
        $or: [
          { nome: regex },
          { cpf: regex },
          { convenio: regex },
          { fornecedor: regex }, // fornecedor ATUAL do paciente
          { 'ultimosFornecedores.fornecedor': regex },
          { observacoes: regex },
          { 'cirurgias.descricao': regex },
          { 'cirurgias.fornecedor': regex },
        ],
      });
    }

    // Filtro específico para o fornecedor ATUAL do paciente (não o da cirurgia —
    // esse é coberto pela busca avançada de cirurgias, em outro módulo).
    // Comparação exata, mas insensível a acento/maiúscula via collation (ver
    // final do método) — contra o array, o Mongo já casa se QUALQUER elemento
    // bater (padrão do Mongo pra igualdade em array), então isso continua
    // funcionando pra paciente com mais de um fornecedor atual simultâneo.
    if (fornecedor) {
      matchConditions.$and.push({ fornecedor });
    }

    // Comparação exata, mas insensível a acento/maiúscula via collation (ver
    // final do método) — regex não resolve aqui: duas grafias do mesmo
    // convênio podem divergir só no acento, e regex normal trata isso como
    // strings diferentes.
    if (convenio) {
      matchConditions.$and.push({ convenio });
    }

    // Filtro estrutural: pacientes sem NENHUM registro de cirurgia. `semCirurgias`
    // chega como string 'true' via querystring HTTP, então compara com ambos os
    // formatos em vez de assumir booleano nativo.
    if (semCirurgias === true || semCirurgias === 'true') {
      matchConditions.$and.push({ cirurgias: { $size: 0 } });
    }

    if (dataCirurgia) {
      const [inicio, fim] = criarIntervaloDeData(dataCirurgia);
      if (inicio && fim) {
        matchConditions.$and.push({
          $expr: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$cirurgias', []] },
                    as: 'c',
                    cond: {
                      $and: [
                        { $ne: ['$$c.data', null] },
                        { $gte: [{ $toDate: '$$c.data' }, inicio] },
                        { $lte: [{ $toDate: '$$c.data' }, fim] },
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
        });
      }
    }

    if (matchConditions.$and.length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    const sortOptions = {};
    if (sortBy === 'nome_asc') {
      sortOptions.nome = 1;
    } else if (sortBy === 'data_asc') {
      sortOptions.dataRnm = 1;
    } else if (sortBy === 'data_desc') {
      sortOptions.dataRnm = -1;
    } else {
      // Ordenação padrão: pacientes com alterações mais recentes primeiro (não
      // por data de criação) — é assim que "Registros Recentes" no dashboard
      // mostra quem acabou de ser editado no topo da lista.
      sortOptions.updatedAt = -1;
    }
    pipeline.push({ $sort: sortOptions });

    // strength: 1 faz comparações de string (usadas nos $match de `fornecedor`
    // e `convenio`, e no $sort por nome) ignorarem tanto maiúscula/minúscula
    // quanto acento — não afeta a busca livre "q", que continua via regex e
    // sensível a acento.
    return PacienteModel.aggregate(pipeline).collation({ locale: 'pt', strength: 1 });
  }
}

module.exports = BuscarPacientesQuery;
