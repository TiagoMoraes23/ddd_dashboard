const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { faker } = require('@faker-js/faker');
const BuscarCirurgiasQuery = require('./BuscarCirurgiasQuery');
const PacienteModel = require('../../pacientes/infra/database/mongoose/PacienteSchema');
const CirurgiaModel = require('../infra/database/mongoose/CirurgiaSchema');

jest.setTimeout(60000);

const criarCirurgia = (pacienteId, overrides = {}) => ({
  _id: faker.string.uuid(),
  pacienteId: String(pacienteId),
  status: 'Realizado',
  ...overrides,
});

describe('Query: BuscarCirurgiasQuery (Integration)', () => {
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
    query = new BuscarCirurgiasQuery();
  });

  afterEach(async () => {
    await PacienteModel.deleteMany({});
    await CirurgiaModel.deleteMany({});
  });

  it('deve expor pacienteDataRnm e pacienteUltimosFornecedores (usados pela exportação de planilha)', async () => {
    await PacienteModel.create({
      _id: 'exp1',
      nome: 'ParaExportar',
      cpf: '70',
      dataRnm: new Date('2026-01-15T00:00:00.000Z'),
      ultimosFornecedores: [{ fornecedor: 'FornecedorA', data: new Date('2026-01-10T00:00:00.000Z') }],
    });
    await CirurgiaModel.create(criarCirurgia('exp1'));

    const resultado = await query.execute({});

    expect(resultado).toHaveLength(1);
    expect(resultado[0].pacienteDataRnm).toEqual(new Date('2026-01-15T00:00:00.000Z'));
    expect(resultado[0].pacienteUltimosFornecedores).toEqual([
      { fornecedor: 'FornecedorA', data: new Date('2026-01-10T00:00:00.000Z') },
    ]);
  });

  it('deve filtrar o fornecedor da cirurgia por correspondencia EXATA, sem falsos positivos por substring', async () => {
    await PacienteModel.create([
      { _id: 'r1', nome: 'PacienteComFornecedorCurto', cpf: '50' },
      { _id: 'r2', nome: 'PacienteComFornecedorLongo', cpf: '51' },
    ]);
    await CirurgiaModel.create([
      criarCirurgia('r1', { fornecedor: 'FornecedorD' }),
      criarCirurgia('r2', { fornecedor: 'Dynamic FornecedorD' }),
    ]);

    const resultado = await query.execute({ fornecedor: 'FornecedorD' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].pacienteNome).toBe('PacienteComFornecedorCurto');
  });

  it('junta o array de fornecedores atuais do paciente numa string no pacienteFornecedor', async () => {
    await PacienteModel.create({ _id: 'r4', nome: 'ComVariosFornecedores', cpf: '53', fornecedor: ['FornecedorA', 'FornecedorD'] });
    await CirurgiaModel.create(criarCirurgia('r4', { fornecedor: 'FornecedorE' }));

    const resultado = await query.execute({ q: 'ComVariosFornecedores' });

    expect(resultado[0].pacienteFornecedor).toBe('FornecedorA, FornecedorD');
  });

  it('deve funcionar mesmo com _id legado de paciente (ObjectId nativo, nao string)', async () => {
    const idLegado = new mongoose.Types.ObjectId();
    await PacienteModel.collection.insertOne({ _id: idLegado, nome: 'PacienteLegado', cpf: '999' });
    await CirurgiaModel.create(criarCirurgia(idLegado, { fornecedor: 'FornecedorD' }));

    const resultado = await query.execute({ fornecedor: 'FornecedorD' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].pacienteNome).toBe('PacienteLegado');
  });
});
