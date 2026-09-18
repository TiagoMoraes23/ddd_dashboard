const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { faker } = require('@faker-js/faker');
const ObterEstatisticasDashboardQuery = require('./ObterEstatisticasDashboardQuery');
const PacienteModel = require('../../pacientes/infra/database/mongoose/PacienteSchema');
const CirurgiaModel = require('../../cirurgias/infra/database/mongoose/CirurgiaSchema');

jest.setTimeout(60000);

// Helper para gerar uma data relativa a hoje (evita testes frágeis por causa da passagem do tempo).
const mesesAtras = (n) => {
  const data = new Date();
  data.setMonth(data.getMonth() - n);
  return data;
};

const criarCirurgia = (pacienteId, overrides = {}) => ({
  _id: faker.string.uuid(),
  pacienteId,
  status: 'Autorizado',
  ...overrides,
});

describe('Query: ObterEstatisticasDashboardQuery (Integration)', () => {
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
    query = new ObterEstatisticasDashboardQuery();
  });

  afterEach(async () => {
    await PacienteModel.deleteMany({});
    await CirurgiaModel.deleteMany({});
  });

  it('deve contar corretamente os status de cirurgia (coleção standalone)', async () => {
    await PacienteModel.create([
      { _id: 'p1', nome: 'A', cpf: '1', dataRnm: mesesAtras(1) },
      { _id: 'p2', nome: 'B', cpf: '2', dataRnm: mesesAtras(1) },
      { _id: 'p3', nome: 'C', cpf: '3', dataRnm: mesesAtras(1) },
      { _id: 'p4', nome: 'D', cpf: '4', dataRnm: mesesAtras(1) },
    ]);
    await CirurgiaModel.create([
      criarCirurgia('p1', { status: 'Autorizado', data: mesesAtras(1) }),
      criarCirurgia('p2', { status: 'Agendado', data: mesesAtras(1) }),
      criarCirurgia('p3', { status: 'Agendamento Pendente', data: mesesAtras(1) }),
      criarCirurgia('p4', { status: 'Cancelado (outro motivo)', data: mesesAtras(1) }),
    ]);

    const stats = await query.execute();

    expect(stats.autorizados).toBe(1);
    expect(stats.agendados).toBe(1);
    expect(stats.agendamentoPendente).toBe(1);
  });

  it('deve contar RNM vencida (>12 meses) e a janela de solicitar nova RNM (entre 11 e 12 meses)', async () => {
    await PacienteModel.create([
      { _id: 'p5', nome: 'Vencida', cpf: '5', dataRnm: mesesAtras(13) },
      { _id: 'p6', nome: 'JanelaAlerta', cpf: '6', dataRnm: mesesAtras(11.5) },
      { _id: 'p7', nome: 'Valida', cpf: '7', dataRnm: mesesAtras(1) },
    ]);

    const stats = await query.execute();

    expect(stats.rnmVencidas).toBe(1);
    expect(stats.solicitarNovaRnm).toBe(1);
  });

  it('deve contar reentrada: RNM valida + ao menos uma cirurgia Realizado ha mais de 3 meses', async () => {
    await PacienteModel.create([
      // Qualifica: RNM valida, cirurgia Realizado ha 4 meses
      { _id: 'p8', nome: 'Reentrada1', cpf: '8', dataRnm: mesesAtras(1) },
      // Nao qualifica: cirurgia Realizado recente demais (ha 1 mes)
      { _id: 'p9', nome: 'Recente', cpf: '9', dataRnm: mesesAtras(1) },
      // Nao qualifica: RNM vencida
      { _id: 'p10', nome: 'RnmVencida', cpf: '10', dataRnm: mesesAtras(13) },
      // Nao qualifica: status diferente de Realizado
      { _id: 'p11', nome: 'Agendado', cpf: '11', dataRnm: mesesAtras(1) },
    ]);
    await CirurgiaModel.create([
      criarCirurgia('p8', { status: 'Realizado', data: mesesAtras(4) }),
      criarCirurgia('p9', { status: 'Realizado', data: mesesAtras(1) }),
      criarCirurgia('p10', { status: 'Realizado', data: mesesAtras(4) }),
      criarCirurgia('p11', { status: 'Agendado', data: mesesAtras(4) }),
    ]);

    const stats = await query.execute();

    expect(stats.reentrada).toBe(1);
  });

  it('deve contar reentrada mesmo com _id legado de paciente (ObjectId nativo, nao string)', async () => {
    // Achado real ao vivo: pacientes existentes hoje têm _id como ObjectId
    // nativo (o schema declarar String não converte dado já existente), mas
    // `cirurgia.pacienteId` é sempre String — o join precisa lidar com isso.
    const idLegado = new mongoose.Types.ObjectId();
    await PacienteModel.collection.insertOne({ _id: idLegado, nome: 'PacienteLegado', cpf: '999', dataRnm: mesesAtras(1) });
    await CirurgiaModel.create(criarCirurgia(String(idLegado), { status: 'Realizado', data: mesesAtras(4) }));

    const stats = await query.execute();

    expect(stats.reentrada).toBe(1);
  });

  it('deve retornar zeros quando nao ha pacientes', async () => {
    const stats = await query.execute();

    expect(stats).toEqual({
      autorizados: 0,
      agendados: 0,
      agendamentoPendente: 0,
      rnmVencidas: 0,
      solicitarNovaRnm: 0,
      reentrada: 0,
    });
  });
});
