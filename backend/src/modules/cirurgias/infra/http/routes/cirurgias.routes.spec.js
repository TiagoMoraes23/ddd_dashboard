const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { faker } = require('@faker-js/faker');

jest.setTimeout(60000);

describe('Rota: GET /buscar (cirurgias)', () => {
  let mongoServer;
  let app;
  let PacienteModel;
  let CirurgiaModel;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    PacienteModel = require('../../../../pacientes/infra/database/mongoose/PacienteSchema');
    CirurgiaModel = require('../../database/mongoose/CirurgiaSchema');
    const cirurgiasRouter = require('./cirurgias.routes');

    app = express();
    app.use(express.json());
    app.use('/api/v2/cirurgias', cirurgiasRouter);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await PacienteModel.deleteMany({});
    await CirurgiaModel.deleteMany({});
  });

  const criarCirurgia = (pacienteId, overrides = {}) => ({
    _id: faker.string.uuid(),
    pacienteId: String(pacienteId),
    status: 'Realizado',
    ...overrides,
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

    const resposta = await request(app).get('/api/v2/cirurgias/buscar').query({ fornecedor: 'FornecedorD' });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].pacienteNome).toBe('PacienteComFornecedorCurto');
  });

  it('deve filtrar o fornecedor da cirurgia ignorando acento (variacao de acentuacao cadastrada por usuarios diferentes)', async () => {
    await PacienteModel.create([
      { _id: 'r5', nome: 'ComAcentoCirurgia', cpf: '54' },
      { _id: 'r6', nome: 'SemAcentoCirurgia', cpf: '55' },
    ]);
    await CirurgiaModel.create([
      criarCirurgia('r5', { fornecedor: 'FornecedorÁ' }),
      criarCirurgia('r6', { fornecedor: 'FornecedorA' }),
    ]);

    const resposta = await request(app).get('/api/v2/cirurgias/buscar').query({ fornecedor: 'FornecedorA' });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(2);
  });

  it('junta o array de fornecedores atuais do paciente numa string no pacienteFornecedor', async () => {
    await PacienteModel.create([
      { _id: 'r4', nome: 'ComVariosFornecedores', cpf: '53', fornecedor: ['FornecedorA', 'FornecedorD'] },
    ]);
    await CirurgiaModel.create(criarCirurgia('r4', { fornecedor: 'FornecedorE' }));

    const resposta = await request(app).get('/api/v2/cirurgias/buscar').query({ q: 'ComVariosFornecedores' });

    expect(resposta.status).toBe(200);
    expect(resposta.body[0].pacienteFornecedor).toBe('FornecedorA, FornecedorD');
  });

  it('a busca livre (q) continua fazendo correspondencia parcial de proposito', async () => {
    await PacienteModel.create([{ _id: 'r3', nome: 'PacienteComFornecedorComposto', cpf: '52' }]);
    await CirurgiaModel.create(criarCirurgia('r3', { fornecedor: 'Dynamic FornecedorD' }));

    const resposta = await request(app).get('/api/v2/cirurgias/buscar').query({ q: 'FornecedorD' });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].pacienteNome).toBe('PacienteComFornecedorComposto');
  });

  it('deve funcionar mesmo com _id legado de paciente (ObjectId nativo, nao string)', async () => {
    // Achado real ao vivo: pacientes existentes hoje têm _id como ObjectId
    // nativo (schema declarar String não converte dado já existente).
    const idLegado = new mongoose.Types.ObjectId();
    await PacienteModel.collection.insertOne({ _id: idLegado, nome: 'PacienteLegado', cpf: '999' });
    await CirurgiaModel.create(criarCirurgia(idLegado, { fornecedor: 'FornecedorD' }));

    const resposta = await request(app).get('/api/v2/cirurgias/buscar').query({ fornecedor: 'FornecedorD' });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].pacienteNome).toBe('PacienteLegado');
  });
});

describe('Escrita de cirurgias (coleção standalone)', () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const cirurgiasRouter = require('./cirurgias.routes');

    app = express();
    app.use(express.json());
    app.use('/api/v2/cirurgias', cirurgiasRouter);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    const CirurgiaModel = require('../../../infra/database/mongoose/CirurgiaSchema');
    await CirurgiaModel.deleteMany({});
  });

  it('POST / cria uma cirurgia sem exigir data/horario (estagio anterior ao agendamento)', async () => {
    const resposta = await request(app).post('/api/v2/cirurgias').send({
      pacienteId: 'paciente-1',
      descricao: 'Cirurgia de teste',
      status: 'Autorizado',
    });

    expect(resposta.status).toBe(201);
    expect(resposta.body.status).toBe('Autorizado');
  });

  it('PUT /:id atualiza os campos de uma cirurgia existente', async () => {
    const criada = await request(app).post('/api/v2/cirurgias').send({
      pacienteId: 'paciente-2',
      descricao: 'Original',
      status: 'Autorizado',
    });

    const resposta = await request(app).put(`/api/v2/cirurgias/${criada.body._id}`).send({
      descricao: 'Editada',
      regiao: ['Ombro'],
    });

    expect(resposta.status).toBe(200);
    expect(resposta.body.descricao).toBe('Editada');
    expect(resposta.body.regiao).toEqual(['Ombro']);
  });

  it('PUT /:id retorna 404 para cirurgia inexistente', async () => {
    const resposta = await request(app).put('/api/v2/cirurgias/id-que-nao-existe').send({ descricao: 'x' });
    expect(resposta.status).toBe(404);
  });

  it('DELETE /:id apaga a cirurgia', async () => {
    const criada = await request(app).post('/api/v2/cirurgias').send({
      pacienteId: 'paciente-3',
      descricao: 'Para apagar',
    });

    const resposta = await request(app).delete(`/api/v2/cirurgias/${criada.body._id}`);
    expect(resposta.status).toBe(204);

    const buscaApagada = await request(app).put(`/api/v2/cirurgias/${criada.body._id}`).send({ descricao: 'x' });
    expect(buscaApagada.status).toBe(404);
  });

  it('DELETE /:id retorna 404 para cirurgia inexistente', async () => {
    const resposta = await request(app).delete('/api/v2/cirurgias/id-que-nao-existe');
    expect(resposta.status).toBe(404);
  });

  it('PATCH /:id/status atualiza o status de uma cirurgia existente', async () => {
    const criada = await request(app).post('/api/v2/cirurgias').send({
      pacienteId: 'paciente-4',
      descricao: 'Cirurgia a autorizar',
      status: 'Agendamento Pendente',
    });

    const resposta = await request(app).patch(`/api/v2/cirurgias/${criada.body._id}/status`).send({ status: 'Autorizado' });

    expect(resposta.status).toBe(200);
    // AtualizarStatusCirurgiaUseCase devolve a entidade de domínio (não o
    // documento cru do repositório, diferente de PUT/POST acima) — o VO
    // StatusCirurgia serializa como objeto, não como string.
    expect(resposta.body.status).toEqual({ valor: 'Autorizado' });
  });

  it('PATCH /:id/status retorna 400 para um status inválido', async () => {
    const criada = await request(app).post('/api/v2/cirurgias').send({
      pacienteId: 'paciente-5',
      descricao: 'Cirurgia teste',
      status: 'Agendamento Pendente',
    });

    const resposta = await request(app)
      .patch(`/api/v2/cirurgias/${criada.body._id}/status`)
      .send({ status: 'Status Que Nao Existe' });

    expect(resposta.status).toBe(400);
  });

  it('PATCH /:id/status retorna 404 para cirurgia inexistente', async () => {
    const resposta = await request(app).patch('/api/v2/cirurgias/id-que-nao-existe/status').send({ status: 'Autorizado' });
    expect(resposta.status).toBe(404);
  });
});
