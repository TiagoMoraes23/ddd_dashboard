const gerarPlanilhaCirurgias = require('./gerarPlanilhaCirurgias');

// Lê os valores de uma linha do worksheet como um objeto {header: valor},
// pra não depender de índice de coluna nos testes.
function linhaComoObjeto(worksheet, numeroLinha) {
  const headerRow = worksheet.getRow(1);
  const row = worksheet.getRow(numeroLinha);
  const obj = {};
  headerRow.eachCell((cell, colNumber) => {
    obj[cell.value] = row.getCell(colNumber).value;
  });
  return obj;
}

describe('gerarPlanilhaCirurgias', () => {
  it('gera uma planilha vazia (só cabeçalho) quando não há linhas', () => {
    const workbook = gerarPlanilhaCirurgias([]);
    const worksheet = workbook.getWorksheet('Cirurgias');

    expect(worksheet.rowCount).toBe(1);
    expect(worksheet.getRow(1).getCell(1).value).toBe('Paciente');
  });

  it('gera uma linha por paciente, concatenando cirurgias multi-valor com ";\\n"', () => {
    const linhas = [
      {
        nome: 'Maria Silva', cpf: '11122233344', convenio: 'ConvenioX',
        fornecedorAtual: ['FornecedorA', 'FornecedorD'],
        dataRnm: new Date('2026-01-15T00:00:00.000Z'),
        ultimosFornecedores: [{ fornecedor: 'FornecedorD', data: new Date('2025-06-01T00:00:00.000Z') }],
        cirurgias: [
          { status: 'Realizado', data: new Date('2026-01-01T00:00:00.000Z'), horario: '11:00', regiao: ['Ombro', 'Cotovelo'], opme: 'Kit A', fornecedor: 'FornecedorA', hospital: 'HospitalA', descricao: 'Obs 1' },
          { status: 'Agendamento Pendente', data: null, horario: null, regiao: ['Joelho'], opme: null, fornecedor: 'FornecedorD', hospital: 'HospitalB', descricao: null },
        ],
      },
    ];

    const workbook = gerarPlanilhaCirurgias(linhas);
    const worksheet = workbook.getWorksheet('Cirurgias');
    const linha = linhaComoObjeto(worksheet, 2);

    expect(linha['Paciente']).toBe('Maria Silva');
    expect(linha['CPF']).toBe('11122233344');
    expect(linha['Fornecedor Atual']).toBe('FornecedorA, FornecedorD');
    expect(linha['Status Cirurgias']).toBe('Realizado;\nAgendamento Pendente');
    expect(linha['Datas Cirurgias']).toBe('01/01/2026;\nN/A');
    expect(linha['Horários']).toBe('11:00;\n—');
    expect(linha['Região Cirurgias']).toBe('Ombro, Cotovelo;\nJoelho');
    expect(linha['OPME']).toBe('Kit A;\n—');
    expect(linha['Fornecedores Cirurgias']).toBe('FornecedorA;\nFornecedorD');
    expect(linha['Hospitais Cirurgias']).toBe('HospitalA;\nHospitalB');
    expect(linha['Observações Cirurgias']).toBe('Obs 1;\nN/A');
    expect(linha['Data RNM']).toBe('15/01/2026');
    expect(linha['Últimos Fornecedores']).toBe('FornecedorD (01/06/2025)');
  });

  it('trata paciente sem nenhuma cirurgia ("sem cirurgias") com N/A nas colunas de cirurgia', () => {
    const linhas = [
      { nome: 'Joao', cpf: '999', convenio: null, fornecedorAtual: [], dataRnm: null, ultimosFornecedores: [], cirurgias: [] },
    ];

    const workbook = gerarPlanilhaCirurgias(linhas);
    const linha = linhaComoObjeto(workbook.getWorksheet('Cirurgias'), 2);

    expect(linha['Status Cirurgias']).toBe('N/A');
    expect(linha['Fornecedor Atual']).toBe('N/A');
    expect(linha['Data RNM']).toBe('N/A');
    expect(linha['Últimos Fornecedores']).toBe('N/A');
  });

  it('aceita fornecedorAtual já como string (ramo "só filtro de cirurgia", que já vem joined)', () => {
    const linhas = [
      { nome: 'Ana', cpf: '444', convenio: 'ConvenioX', fornecedorAtual: 'FornecedorA, FornecedorD', dataRnm: null, ultimosFornecedores: [], cirurgias: [] },
    ];

    const workbook = gerarPlanilhaCirurgias(linhas);
    const linha = linhaComoObjeto(workbook.getWorksheet('Cirurgias'), 2);

    expect(linha['Fornecedor Atual']).toBe('FornecedorA, FornecedorD');
  });
});
