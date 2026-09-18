/**
 * Estágio de agregação que, num pipeline já posicionado em Paciente, junta a
 * coleção `cirurgias` standalone e sobrescreve o campo `cirurgias`
 * com o array de cirurgias reais do paciente — em vez do array embutido
 * legado (`Paciente.cirurgias`), que nunca foi migrado/normalizado e
 * continua no Mongo intocado só como rede de segurança de rollback (ADR
 * 004), com dados antigos (ex.: "regiao" como string livre não normalizada).
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
