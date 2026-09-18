/**
 * Estágio de agregação que, num pipeline já posicionado em Paciente, junta a
 * coleção `cirurgias` standalone (Fase 6) e sobrescreve o campo `cirurgias`
 * com o array de cirurgias reais do paciente — em vez do array embutido
 * legado (`Paciente.cirurgias`), que nunca foi migrado/normalizado e
 * continua no Mongo intocado só como rede de segurança de rollback (ADR
 * 004), com dados antigos (ex.: "regiao" como string livre não normalizada).
 *
 * Extraído para uso compartilhado depois de um bug real: BuscarPacientesQuery
 * já tinha esse estágio, mas BuscarPacientesPorKpiQuery não — o drilldown de
 * KPI devolvia pacientes com o array embutido (não normalizado), enquanto a
 * busca avançada/rápida (que usa BuscarPacientesQuery) já mostrava a região
 * normalizada da coleção standalone. Mesma armadilha de $toString já corrigida
 * antes (Fase 2, Fase 6c) — reaproveitar este helper evita uma 3ª divergência.
 */
function criarEstagioLookupCirurgias() {
  return {
    $lookup: {
      from: 'cirurgias',
      let: { pacienteIdStr: { $toString: '$_id' } },
      pipeline: [{ $match: { $expr: { $eq: ['$pacienteId', '$$pacienteIdStr'] } } }],
      as: 'cirurgias',
    },
  };
}

module.exports = criarEstagioLookupCirurgias;
