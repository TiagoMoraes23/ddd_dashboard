const ExcelJS = require('exceljs');

// Formata data para o padrão brasileiro, em UTC (evita o "um dia a menos"
// causado por conversão de fuso horário em datas sem horário).
function formatarData(data) {
  if (!data) return 'N/A';
  return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Campos que podem ser array (fornecedor atual) ou já vir como string
// (quando a linha veio de BuscarCirurgiasQuery, que já junta o array antes
// de devolver) — normaliza os dois casos pro mesmo formato de célula.
function paraTexto(valor) {
  if (Array.isArray(valor)) return valor.join(', ') || 'N/A';
  return valor || 'N/A';
}

function formatarUltimosFornecedores(ultimosFornecedores) {
  if (!Array.isArray(ultimosFornecedores) || ultimosFornecedores.length === 0) return 'N/A';
  return ultimosFornecedores.map((u) => `${u.fornecedor || 'N/A'} (${formatarData(u.data)})`).join(', ');
}

// Junta os valores de todas as cirurgias de um paciente numa única célula,
// uma por linha (';\n', mesmo separador do legado) — o worksheet ativa
// wrapText pra células com quebra de linha, ver abaixo.
function juntarCampoCirurgias(cirurgias, mapeador) {
  if (!cirurgias || cirurgias.length === 0) return 'N/A';
  return cirurgias.map(mapeador).join(';\n');
}

/**
 * Gera o workbook (uma linha por paciente, cirurgias concatenadas na mesma
 * célula) a partir das linhas já montadas por ExportarCirurgiasUseCase.
 * Função pura, sem dependência de banco — testável isoladamente.
 */
function gerarPlanilhaCirurgias(linhas) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cirurgias');

  worksheet.columns = [
    { header: 'Paciente', key: 'nome', width: 30 },
    { header: 'CPF', key: 'cpf', width: 15 },
    { header: 'Convênio', key: 'convenio', width: 25 },
    { header: 'Fornecedor Atual', key: 'fornecedorAtual', width: 30 },
    { header: 'Status Cirurgias', key: 'statusCirurgias', width: 25 },
    { header: 'Datas Cirurgias', key: 'datasCirurgias', width: 20 },
    { header: 'Horários', key: 'horariosCirurgias', width: 15 },
    { header: 'Região Cirurgias', key: 'regiaoCirurgias', width: 25 },
    { header: 'OPME', key: 'opmeCirurgias', width: 30 },
    { header: 'Fornecedores Cirurgias', key: 'fornecedoresCirurgias', width: 40 },
    { header: 'Hospitais Cirurgias', key: 'hospitaisCirurgias', width: 40 },
    { header: 'Observações Cirurgias', key: 'descricoesCirurgias', width: 50 },
    { header: 'Data RNM', key: 'dataRnm', width: 15 },
    { header: 'Últimos Fornecedores', key: 'ultimosFornecedores', width: 40 },
  ];

  linhas.forEach((linha) => {
    const cirurgias = linha.cirurgias || [];
    const row = worksheet.addRow({
      nome: linha.nome || 'N/A',
      cpf: linha.cpf || 'N/A',
      convenio: linha.convenio || 'N/A',
      fornecedorAtual: paraTexto(linha.fornecedorAtual),
      statusCirurgias: juntarCampoCirurgias(cirurgias, (c) => c.status || 'N/A'),
      datasCirurgias: juntarCampoCirurgias(cirurgias, (c) => formatarData(c.data)),
      horariosCirurgias: juntarCampoCirurgias(cirurgias, (c) => c.horario || '—'),
      regiaoCirurgias: juntarCampoCirurgias(cirurgias, (c) => paraTexto(c.regiao)),
      opmeCirurgias: juntarCampoCirurgias(cirurgias, (c) => c.opme || '—'),
      fornecedoresCirurgias: juntarCampoCirurgias(cirurgias, (c) => c.fornecedor || 'N/A'),
      hospitaisCirurgias: juntarCampoCirurgias(cirurgias, (c) => c.hospital || 'N/A'),
      descricoesCirurgias: juntarCampoCirurgias(cirurgias, (c) => c.descricao || 'N/A'),
      dataRnm: formatarData(linha.dataRnm),
      ultimosFornecedores: formatarUltimosFornecedores(linha.ultimosFornecedores),
    });

    row.eachCell({ includeEmpty: true }, (cell) => {
      if (String(cell.value).includes('\n')) {
        cell.alignment = { wrapText: true, vertical: 'top' };
      }
    });
  });

  return workbook;
}

module.exports = gerarPlanilhaCirurgias;
