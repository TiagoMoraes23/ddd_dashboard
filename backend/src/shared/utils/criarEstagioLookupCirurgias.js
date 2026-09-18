
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
