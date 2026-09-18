/**
 * Converte um texto de data parcial (dd/mm/aaaa, mm/aaaa ou aaaa) num
 * intervalo [inicio, fim] em UTC cobrindo todo o período informado.
 * Restaurado do pacienteController.js legado (busca por data de cirurgia).
 * @param {string} texto
 * @returns {[Date, Date] | [null, null]}
 */
function criarIntervaloDeData(texto) {
  if (!texto) return [null, null];

  const diaMesAnoRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const mesAnoRegex = /^(\d{2})\/(\d{4})$/;
  const anoRegex = /^\d{4}$/;

  const matchDiaMesAno = texto.match(diaMesAnoRegex);
  const matchMesAno = texto.match(mesAnoRegex);
  const matchAno = texto.match(anoRegex);

  if (matchDiaMesAno) {
    const dia = parseInt(matchDiaMesAno[1], 10);
    const mes = parseInt(matchDiaMesAno[2], 10) - 1;
    const ano = parseInt(matchDiaMesAno[3], 10);
    if (dia > 0 && dia <= 31 && mes >= 0 && mes < 12) {
      return [new Date(Date.UTC(ano, mes, dia)), new Date(Date.UTC(ano, mes, dia, 23, 59, 59, 999))];
    }
    return [null, null];
  }

  if (matchMesAno) {
    const mes = parseInt(matchMesAno[1], 10) - 1;
    const ano = parseInt(matchMesAno[2], 10);
    if (mes >= 0 && mes < 12) {
      return [new Date(Date.UTC(ano, mes, 1)), new Date(Date.UTC(ano, mes + 1, 0, 23, 59, 59, 999))];
    }
    return [null, null];
  }

  if (matchAno) {
    const ano = parseInt(texto, 10);
    return [new Date(Date.UTC(ano, 0, 1)), new Date(Date.UTC(ano, 11, 31, 23, 59, 59, 999))];
  }

  return [null, null];
}

module.exports = criarIntervaloDeData;
