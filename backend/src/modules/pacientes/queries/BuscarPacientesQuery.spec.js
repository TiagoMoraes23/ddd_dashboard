const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { faker } = require('@faker-js/faker');
const BuscarPacientesQuery = require('./BuscarPacientesQuery');
const PacienteModel = require('../infra/database/mongoose/PacienteSchema');
const CirurgiaModel = require('../../cirurgias/infra/database/mongoose/CirurgiaSchema');

jest.setTimeout(60000);

const criarCirurgia = (pacienteId, overrides = {}) => ({
  _id: faker.string.uuid(),
  pacienteId: String(pacienteId),
  status: 'Realizado',
  ...overrides,
});

describe('Query: BuscarPacientesQuery (Integration)', () => {
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
    query = new BuscarPacientesQuery();
  });

  afterEach(async () => {
    await PacienteModel.deleteMany({});
    await CirurgiaModel.deleteMany({});
  });

  it('deve encontrar pelo fornecedor ATUAL do paciente na busca livre (q)', async () => {
    await PacienteModel.create([
      { _id: 'p1', nome: 'PacienteComEsseFornecedor', cpf: '1', fornecedor: ['FornecedorA'] },
      { _id: 'p2', nome: 'PacienteSemEsseFornecedor', cpf: '2', fornecedor: ['Outro'] },
    ]);

    const resultado = await query.execute({ q: 'FornecedorA' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('PacienteComEsseFornecedor');
  });

  it('deve encontrar pelo nome de um ultimo fornecedor na busca livre (q)', async () => {
    await PacienteModel.create([
      { _id: 'puf1', nome: 'ComUltimoFornecedor', cpf: '30', ultimosFornecedores: [{ fornecedor: 'FornecedorB', data: new Date('2025-01-01') }] },
      { _id: 'puf2', nome: 'SemEsseFornecedor', cpf: '31', ultimosFornecedores: [{ fornecedor: 'FornecedorC', data: new Date('2025-01-01') }] },
    ]);

    const resultado = await query.execute({ q: 'FornecedorB' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('ComUltimoFornecedor');
  });

  it('deve filtrar pelo convenio do paciente (correspondencia exata, case-insensitive)', async () => {
    await PacienteModel.create([
      { _id: 'pc1', nome: 'ConvenioY', cpf: '20', convenio: 'convenio y saude' },
      { _id: 'pc2', nome: 'ConvenioX', cpf: '21', convenio: 'ConvenioX' },
    ]);

    const resultado = await query.execute({ convenio: 'Convenio Y Saude' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('ConvenioY');
  });

  it('deve filtrar pelo convenio ignorando acento (mesmo convenio cadastrado com grafias diferentes por usuarios diferentes)', async () => {
    await PacienteModel.create([
      { _id: 'pc3', nome: 'ComAcento', cpf: '22', convenio: 'Boa Saúde' },
      { _id: 'pc4', nome: 'SemAcento', cpf: '23', convenio: 'Boa Saude' },
      { _id: 'pc5', nome: 'ConvenioDiferente', cpf: '24', convenio: 'ConvenioX' },
    ]);

    const resultado = await query.execute({ convenio: 'Boa Saude' });

    expect(resultado).toHaveLength(2);
    expect(resultado.map((p) => p.nome).sort()).toEqual(['ComAcento', 'SemAcento']);
  });

  it('deve filtrar o fornecedor ATUAL por correspondencia EXATA, sem falsos positivos por substring', async () => {
    await PacienteModel.create([
      { _id: 'pe1', nome: 'ComFornecedorCurto', cpf: '40', fornecedor: ['FornecedorD'] },
      { _id: 'pe2', nome: 'ComFornecedorLongoQueOContem', cpf: '41', fornecedor: ['Dynamic FornecedorD'] },
    ]);

    const resultado = await query.execute({ fornecedor: 'FornecedorD' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('ComFornecedorCurto');
  });

  it('deve filtrar o fornecedor ATUAL ignorando acento (variacao de acentuacao cadastrada por usuarios diferentes)', async () => {
    await PacienteModel.create([
      { _id: 'pe7', nome: 'ComAcentoFornecedor', cpf: '46', fornecedor: ['FornecedorÁ'] },
      { _id: 'pe8', nome: 'SemAcentoFornecedor', cpf: '47', fornecedor: ['FornecedorA'] },
    ]);

    const resultado = await query.execute({ fornecedor: 'FornecedorA' });

    expect(resultado).toHaveLength(2);
  });

  it('deve filtrar o fornecedor ATUAL quando o paciente tem MAIS DE UM fornecedor atual simultaneo', async () => {
    // Negocio dinamico: um paciente pode ter mais de um fornecedor atual ao
    // mesmo tempo (um por articulacao, por exemplo).
    await PacienteModel.create([
      { _id: 'pe5', nome: 'MultiploComFornecedorD', cpf: '44', fornecedor: ['FornecedorA', 'FornecedorD', 'FornecedorB'] },
      { _id: 'pe6', nome: 'MultiploSemFornecedorD', cpf: '45', fornecedor: ['FornecedorA', 'FornecedorC'] },
    ]);

    const resultado = await query.execute({ fornecedor: 'FornecedorD' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('MultiploComFornecedorD');
  });

  it('deve filtrar o convenio por correspondencia EXATA, sem falsos positivos por substring', async () => {
    await PacienteModel.create([
      { _id: 'pe3', nome: 'ConvenioX', cpf: '42', convenio: 'ConvenioX' },
      { _id: 'pe4', nome: 'ConvenioXOne', cpf: '43', convenio: 'ConvenioX One' },
    ]);

    const resultado = await query.execute({ convenio: 'ConvenioX' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('ConvenioX');
  });

  it('deve filtrar pelo fornecedor ATUAL do paciente, nao pelo fornecedor da cirurgia', async () => {
    await PacienteModel.create([
      { _id: 'p3', nome: 'FornecedorAtualA', cpf: '3', fornecedor: ['FornecedorA'] },
      { _id: 'p4', nome: 'SoNaCirurgia', cpf: '4', fornecedor: ['FornecedorE'] },
    ]);
    await CirurgiaModel.create([
      criarCirurgia('p3', { fornecedor: 'FornecedorE' }),
      criarCirurgia('p4', { fornecedor: 'FornecedorA' }),
    ]);

    const resultado = await query.execute({ fornecedor: 'FornecedorA' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('FornecedorAtualA');
  });

  it('deve filtrar por periodo de data da cirurgia (dataCirurgia)', async () => {
    await PacienteModel.create([
      { _id: 'p5', nome: 'CirurgiaFevereiro', cpf: '5' },
      { _id: 'p6', nome: 'CirurgiaMarco', cpf: '6' },
    ]);
    await CirurgiaModel.create([
      criarCirurgia('p5', { data: new Date('2024-02-15T00:00:00.000Z') }),
      criarCirurgia('p6', { data: new Date('2024-03-15T00:00:00.000Z') }),
    ]);

    const resultado = await query.execute({ dataCirurgia: '02/2024' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('CirurgiaFevereiro');
  });

  it('deve ignorar silenciosamente uma dataCirurgia em formato invalido (nao filtra, nao quebra)', async () => {
    await PacienteModel.create([
      { _id: 'p5b', nome: 'CirurgiaFevereiro', cpf: '5b' },
      { _id: 'p6b', nome: 'CirurgiaMarco', cpf: '6b' },
    ]);
    await CirurgiaModel.create([
      criarCirurgia('p5b', { data: new Date('2024-02-15T00:00:00.000Z') }),
      criarCirurgia('p6b', { data: new Date('2024-03-15T00:00:00.000Z') }),
    ]);

    const resultado = await query.execute({ dataCirurgia: 'nao-e-uma-data' });

    expect(resultado).toHaveLength(2); // filtro invalido e' ignorado, nenhum paciente e' excluido
  });

  it('deve funcionar mesmo com _id legado de paciente (ObjectId nativo, nao string)', async () => {
    // Achado real ao vivo: pacientes existentes hoje têm _id como ObjectId
    // nativo (schema declarar String não converte dado já existente).
    const idLegado = new mongoose.Types.ObjectId();
    await PacienteModel.collection.insertOne({ _id: idLegado, nome: 'PacienteLegado', cpf: '999' });
    await CirurgiaModel.create(criarCirurgia(idLegado, { data: new Date('2024-02-15T00:00:00.000Z') }));

    const resultado = await query.execute({ dataCirurgia: '02/2024' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('PacienteLegado');
  });

  it('deve ordenar por data da RNM (data_asc e data_desc)', async () => {
    await PacienteModel.create([
      { _id: 'p7', nome: 'RnmAntiga', cpf: '7', dataRnm: new Date('2023-01-01') },
      { _id: 'p8', nome: 'RnmRecente', cpf: '8', dataRnm: new Date('2024-01-01') },
    ]);

    const asc = await query.execute({ sortBy: 'data_asc' });
    expect(asc.map((p) => p.nome)).toEqual(['RnmAntiga', 'RnmRecente']);

    const desc = await query.execute({ sortBy: 'data_desc' });
    expect(desc.map((p) => p.nome)).toEqual(['RnmRecente', 'RnmAntiga']);
  });

  it('deve ordenar por nome (nome_asc)', async () => {
    await PacienteModel.create([
      { _id: 'p11', nome: 'Zeca', cpf: '11' },
      { _id: 'p12', nome: 'Ana', cpf: '12' },
    ]);

    const resultado = await query.execute({ sortBy: 'nome_asc' });

    expect(resultado.map((p) => p.nome)).toEqual(['Ana', 'Zeca']);
  });

  it('deve retornar todos os pacientes ativos quando nenhum filtro e aplicado', async () => {
    await PacienteModel.create([
      { _id: 'p9', nome: 'A', cpf: '9' },
      { _id: 'p10', nome: 'B', cpf: '10' },
    ]);

    const resultado = await query.execute({});

    expect(resultado).toHaveLength(2);
  });

  it('deve excluir pacientes inativos (soft-deletados) do resultado', async () => {
    await PacienteModel.create([
      { _id: 'p11', nome: 'Ativo', cpf: '11', ativo: true },
      { _id: 'p12', nome: 'Inativo', cpf: '12', ativo: false },
    ]);

    const resultado = await query.execute({});

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('Ativo');
  });

  it('deve filtrar pacientes sem NENHUM registro de cirurgia (semCirurgias)', async () => {
    await PacienteModel.create([
      { _id: 'sc1', nome: 'SemCirurgia', cpf: '60' },
      { _id: 'sc2', nome: 'ComCirurgia', cpf: '61' },
    ]);
    await CirurgiaModel.create(criarCirurgia('sc2'));

    const resultado = await query.execute({ semCirurgias: 'true' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('SemCirurgia');
  });

  it('deve considerar ativo um paciente legado sem o campo "ativo" definido', async () => {
    // Simula um paciente legado real (inserido fora do Mongoose, sem o default do schema aplicado).
    await PacienteModel.collection.insertOne({ _id: 'p13', nome: 'LegadoSemAtivo', cpf: '13' });

    const resultado = await query.execute({});

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('LegadoSemAtivo');
  });
});
