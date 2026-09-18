const PacienteModel = require('../infra/database/mongoose/PacienteSchema');
const criarIntervaloDeData = require('../../../shared/utils/criarIntervaloDeData');
const criarEstagioLookupCirurgias = require('../../../shared/utils/criarEstagioLookupCirurgias');

/**
 * Query otimizada para buscar pacientes e suas cirurgias associadas,
 * utilizando o pipeline de agregação do MongoDB para performance.
 * Segue o padrão CQRS, acessando diretamente a camada de persistência.
 *
 * Cirurgias vivem na coleção standalone `cirurgias` (ADR 001/002/004,
 * migração física executada na Fase 6) — um $lookup traz o array pra dentro
 * do campo `cirurgias` de cada paciente (mesmo nome do campo embutido
 * antigo), então o resto do pipeline (busca livre em cirurgias.descricao/
 * fornecedor, filtro por período) não precisa mudar.
 */
class BuscarPacientesQuery {
  /**
   * Executa a consulta de agregação para buscar e filtrar pacientes.
   * @param {object} [filtros={}] - O objeto contendo os filtros da busca.
   * @param {string} [filtros.q] - Termo de busca livre (nome, cpf, convênio, fornecedor atual,
   *   últimos fornecedores, observações e dados da cirurgia).
   * @param {string} [filtros.fornecedor] - Filtra pelo fornecedor ATUAL do paciente (não da cirurgia).
   * @param {string} [filtros.convenio] - Filtra pelo convênio do paciente.
   * @param {string} [filtros.dataCirurgia] - Filtra pacientes com alguma cirurgia no período
   *   informado (dd/mm/aaaa, mm/aaaa ou aaaa).
   * @param {string} [filtros.sortBy] - Critério de ordenação: 'nome_asc', 'data_asc'/'data_desc'
   *   (por data da RNM) ou o padrão (mais recentes primeiro).
   * @param {boolean|string} [filtros.semCirurgias] - Quando verdadeiro, restringe aos pacientes
   *   sem NENHUM registro de cirurgia (Fase 6f). Mutuamente exclusivo com `dataCirurgia` na prática
   *   (o frontend nunca envia os dois juntos), mas nada aqui impede a combinação caso enviado.
   * @returns {Promise<Array<object>>} Um array de pacientes enriquecidos com suas cirurgias.
   */
  async execute(filtros = {}) {
    const { q, fornecedor, convenio, dataCirurgia, sortBy, semCirurgias } = filtros;
    const pipeline = [];

    // Etapa 0: junta as cirurgias da coleção standalone pra dentro do campo
    // Usa $toString: `pacienteId` é sempre String na
    // coleção standalone, mas o `_id` do paciente pode ser um ObjectId nativo
    // (pacientes legados nunca migrados fisicamente) — confirmado ao vivo
    // contra o Atlas real que um localField/foreignField direto não bate
    // nesses casos.
    pipeline.push(criarEstagioLookupCirurgias());

    // Etapa 1: $match para aplicar os filtros de forma condicional.
    // Exclui sempre os pacientes inativos (soft delete via InativarPacienteUseCase).
    // Trata ausência do campo como ativo (pacientes legados nunca tiveram o
    // default do schema aplicado, pois foram inseridos fora do Mongoose).
    const matchConditions = { $and: [{ ativo: { $ne: false } }] };

    // Filtro de busca livre ('q') que busca em múltiplos campos do paciente e da cirurgia.
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
    // convênio podem divergir só no acento, dado real gerado por usuários
    // diferentes ao longo do tempo, e regex normal trata isso como strings
    // diferentes.
    if (convenio) {
      matchConditions.$and.push({ convenio });
    }

    // Filtro estrutural: pacientes sem NENHUM registro de cirurgia. `semCirurgias`
    // chega como string 'true' via querystring HTTP, então compara com ambos os
    // formatos em vez de assumir booleano nativo.
    if (semCirurgias === true || semCirurgias === 'true') {
      matchConditions.$and.push({ cirurgias: { $size: 0 } });
    }

    // Filtro por período de alguma cirurgia do paciente.
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

    // Adiciona o estágio $match ao pipeline apenas se houver condições a serem aplicadas.
    if (matchConditions.$and.length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Etapa 2: $sort para ordenação dos resultados.
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
