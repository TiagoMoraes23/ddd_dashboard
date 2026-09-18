const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { faker } = require('@faker-js/faker');
const BuscarPacientesPorKpiQuery = require('./BuscarPacientesPorKpiQuery');
const PacienteModel = require('../../pacientes/infra/database/mongoose/PacienteSchema');
const CirurgiaModel = require('../../cirurgias/infra/database/mongoose/CirurgiaSchema');

jest.setTimeout(60000);

const mesesAtras = (n) => {
  const data = new Date();
  data.setMonth(data.getMonth() - n);
  return data;
};

const criarCirurgia = (pacienteId, overrides = {}) => ({
  _id: faker.string.uuid(),
  pacienteId: String(pacienteId),
  status: 'Autorizado',
  ...overrides,
});

describe('Query: BuscarPacientesPorKpiQuery (Integration)', () => {
  let mongoServer;
  let query;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    query = new BuscarPacientesPorKpiQuery();
  });

  afterEach(async () => {
    await PacienteModel.deleteMany({});
    await CirurgiaModel.deleteMany({});
  });

  it('deve lancar erro para um nome de KPI invalido', async () => {
    await expect(query.execute('kpi-que-nao-existe')).rejects.toThrow('KPI inválido');
  });

  it('deve retornar apenas os pacientes com cirurgia Autorizado', async () => {
    await PacienteModel.create([
      { _id: 'p1', nome: 'ComAutorizado', cpf: '1' },
      { _id: 'p2', nome: 'SemAutorizado', cpf: '2' },
    ]);
    await CirurgiaModel.create([
      criarCirurgia('p1', { status: 'Autorizado' }),
      criarCirurgia('p2', { status: 'Agendado' }),
    ]);

    const resultado = await query.execute('autorizados');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('ComAutorizado');
  });

  it('deve retornar apenas os pacientes com cirurgia Agendado', async () => {
    await PacienteModel.create([
      { _id: 'p1', nome: 'ComAgendado', cpf: '1' },
      { _id: 'p2', nome: 'SemAgendado', cpf: '2' },
    ]);
    await CirurgiaModel.create([
      criarCirurgia('p1', { status: 'Agendado' }),
      criarCirurgia('p2', { status: 'Autorizado' }),
    ]);

    const resultado = await query.execute('agendados');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('ComAgendado');
  });

  it('deve retornar apenas os pacientes com cirurgia Agendamento Pendente', async () => {
    await PacienteModel.create([
      { _id: 'p1', nome: 'ComPendente', cpf: '1' },
      { _id: 'p2', nome: 'SemPendente', cpf: '2' },
    ]);
    await CirurgiaModel.create([
      criarCirurgia('p1', { status: 'Agendamento Pendente' }),
      criarCirurgia('p2', { status: 'Realizado' }),
    ]);

    const resultado = await query.execute('agendamentoPendente');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('ComPendente');
  });

  it('deve trazer a regiao normalizada da colecao standalone, nao o array embutido legado nao-normalizado', async () => {
    // Achado real reportado pelo usuario: no drilldown de KPI, "regiao"
    // aparecia como string livre legada (ex.: "Joelhos") em vez do array
    // normalizado (["Joelho"]) que a busca avancada/rapida ja mostrava —
    // porque o paciente embutido legado (nunca migrado/apagado, ADR 004)
    // ainda tem seu proprio campo `cirurgias` desatualizado.
    await PacienteModel.create({
      _id: 'p6',
      nome: 'ComRegiaoEmbutidaDesatualizada',
      cpf: '6',
      // Array embutido legado, deliberadamente com dado NAO normalizado —
      // simula o que ainda existe hoje nos documentos reais (Fase 6b nunca
      // apagou/normalizou este campo, so a colecao standalone).
      cirurgias: [{ descricao: 'legado', fornecedor: 'X', status: 'Agendamento Pendente', data: '2026-01-01', regiao: 'Joelhos' }],
    });
    await CirurgiaModel.create(criarCirurgia('p6', { status: 'Agendamento Pendente', regiao: ['Joelho'] }));

    const resultado = await query.execute('agendamentoPendente');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].cirurgias).toHaveLength(1);
    expect(resultado[0].cirurgias[0].regiao).toEqual(['Joelho']);
  });

  it('deve funcionar mesmo com _id legado (ObjectId nativo, nao string) para KPIs de status', async () => {
    // Achado real ao vivo: pacientes existentes hoje têm _id como ObjectId
    // nativo (o schema declarar String não converte dado já existente).
    // Insere direto na collection (bypassando o casting do Mongoose) pra
    // reproduzir isso de verdade.
    const idLegado = new mongoose.Types.ObjectId();
    await PacienteModel.collection.insertOne({ _id: idLegado, nome: 'PacienteLegado', cpf: '999' });
    await CirurgiaModel.create(criarCirurgia(idLegado, { status: 'Autorizado' }));

    const resultado = await query.execute('autorizados');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('PacienteLegado');
  });

  it('deve retornar os pacientes que precisam solicitar nova RNM (entre 11 e 12 meses)', async () => {
    // 11 meses e meio atrás: estritamente entre a janela [umAnoAtras, onzeMesesAtras) da query.
    const onzeEMeioMesesAtras = mesesAtras(11);
    onzeEMeioMesesAtras.setDate(onzeEMeioMesesAtras.getDate() - 15);

    await PacienteModel.create([
      { _id: 'p1', nome: 'PrecisaRenovar', cpf: '1', dataRnm: onzeEMeioMesesAtras },
      { _id: 'p2', nome: 'AindaValida', cpf: '2', dataRnm: mesesAtras(1) },
      { _id: 'p3', nome: 'JaVencida', cpf: '3', dataRnm: mesesAtras(13) },
    ]);

    const resultado = await query.execute('solicitarNovaRnm');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('PrecisaRenovar');
  });

  it('deve retornar os pacientes com RNM vencida', async () => {
    await PacienteModel.create([
      { _id: 'p3', nome: 'Vencida', cpf: '3', dataRnm: mesesAtras(13) },
      { _id: 'p4', nome: 'Valida', cpf: '4', dataRnm: mesesAtras(1) },
    ]);

    const resultado = await query.execute('rnmVencidas');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('Vencida');
  });

  it('deve retornar o paciente completo para reentrada, mesmo com mais de uma cirurgia Realizado', async () => {
    await PacienteModel.create({ _id: 'p5', nome: 'ReentradaComHistorico', cpf: '5', dataRnm: mesesAtras(1) });
    await CirurgiaModel.create([
      criarCirurgia('p5', { status: 'Realizado', data: mesesAtras(4), fornecedor: 'F1' }),
      criarCirurgia('p5', { status: 'Realizado', data: mesesAtras(10), fornecedor: 'F2' }),
    ]);

    const resultado = await query.execute('reentrada');

    expect(resultado).toHaveLength(1); // não duplica o paciente por ter 2 cirurgias qualificando
    expect(resultado[0].nome).toBe('ReentradaComHistorico');
  });

  it('deve funcionar para reentrada mesmo com _id legado (ObjectId nativo, nao UUID)', async () => {
    // Simula um paciente legado real: inserido direto na collection (bypassando o
    // casting do schema), com _id como ObjectId nativo em vez do UUID string dos
    // pacientes novos. Pega a armadilha de comparar tipos BSON diferentes.
    const idLegado = new mongoose.Types.ObjectId();
    await PacienteModel.collection.insertOne({ _id: idLegado, nome: 'PacienteLegado', cpf: '999', dataRnm: mesesAtras(1) });
    await CirurgiaModel.create(criarCirurgia(idLegado, { status: 'Realizado', data: mesesAtras(4) }));

    const resultado = await query.execute('reentrada');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('PacienteLegado');
  });
});
