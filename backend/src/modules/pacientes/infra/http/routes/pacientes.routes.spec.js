const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const ensureAuthenticated = require('../../../../../shared/infra/http/middlewares/ensureAuthenticated');
const { JWT_SECRET } = require('../../../../../shared/config/jwt');

jest.setTimeout(60000);

// CPF matematicamente válido (mesmo usado nos demais specs do módulo pacientes) —
// necessário aqui porque as rotas de escrita passam pelo Value Object Cpf.
const CPF_VALIDO = '52998224725';

describe('Rotas: /api/v2/pacientes', () => {
  let mongoServer;
  let app;
  let PacienteModel;
  let token;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    PacienteModel = require('../../database/mongoose/PacienteSchema');
    const pacientesRouter = require('./pacientes.routes');

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    // Mesma composição usada em server.js: rota protegida por ensureAuthenticated.
    app.use('/api/v2/pacientes', ensureAuthenticated, pacientesRouter);

    token = jwt.sign({ id: 'user-1', username: 'tester', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await PacienteModel.deleteMany({});
  });

  it('rejeita requisições sem token com 401', async () => {
    const resposta = await request(app).get('/api/v2/pacientes');
    expect(resposta.status).toBe(401);
  });

  it('GET / retorna a lista de pacientes com token válido', async () => {
    await PacienteModel.create({ _id: 'p1', nome: 'Paciente Um', cpf: '111' });

    const resposta = await request(app).get('/api/v2/pacientes').set('Cookie', `token=${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].nome).toBe('Paciente Um');
  });

  it('POST / cria um paciente novo', async () => {
    const resposta = await request(app)
      .post('/api/v2/pacientes')
      .set('Cookie', `token=${token}`)
      .send({ nome: 'Paciente Novo', cpf: CPF_VALIDO });

    expect(resposta.status).toBe(201);
    expect(resposta.body.cpf).toBe(CPF_VALIDO);

    const salvo = await PacienteModel.findOne({ cpf: CPF_VALIDO });
    expect(salvo).not.toBeNull();
  });

  it('POST / com CPF inválido retorna 400, sem persistir nada', async () => {
    const resposta = await request(app)
      .post('/api/v2/pacientes')
      .set('Cookie', `token=${token}`)
      .send({ nome: 'Paciente Inválido', cpf: '123' });

    expect(resposta.status).toBe(400);
    expect(await PacienteModel.countDocuments()).toBe(0);
  });

  it('PUT /:id atualiza um paciente existente', async () => {
    await PacienteModel.create({ _id: 'p2', nome: 'Nome Antigo', cpf: CPF_VALIDO });

    const resposta = await request(app)
      .put('/api/v2/pacientes/p2')
      .set('Cookie', `token=${token}`)
      .send({ nome: 'Nome Atualizado' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe('Nome Atualizado');

    const salvo = await PacienteModel.findOne({ cpf: CPF_VALIDO });
    expect(salvo.nome).toBe('Nome Atualizado');
  });

  it('PUT /:id permite corrigir o CPF do próprio paciente, atualizando o registro existente em vez de duplicá-lo', async () => {
    const NOVO_CPF = '11144477735';
    await PacienteModel.create({ _id: 'p2b', nome: 'Nome Correto', cpf: CPF_VALIDO });

    const resposta = await request(app)
      .put('/api/v2/pacientes/p2b')
      .set('Cookie', `token=${token}`)
      .send({ nome: 'Nome Correto', cpf: NOVO_CPF });

    expect(resposta.status).toBe(200);

    const total = await PacienteModel.countDocuments();
    expect(total).toBe(1);

    const atualizado = await PacienteModel.findOne({ cpf: NOVO_CPF });
    expect(atualizado).not.toBeNull();
    expect(atualizado._id).toBe('p2b');

    const antigo = await PacienteModel.findOne({ cpf: CPF_VALIDO });
    expect(antigo).toBeNull();
  });

  it('PUT /:id rejeita a troca de CPF quando o valor novo já pertence a outro paciente', async () => {
    const OUTRO_CPF = '11144477735';
    await PacienteModel.create({ _id: 'p2c', nome: 'Paciente A', cpf: CPF_VALIDO });
    await PacienteModel.create({ _id: 'p2d', nome: 'Paciente B', cpf: OUTRO_CPF });

    const resposta = await request(app)
      .put('/api/v2/pacientes/p2c')
      .set('Cookie', `token=${token}`)
      .send({ nome: 'Paciente A', cpf: OUTRO_CPF });

    expect(resposta.status).toBe(400);

    const paciente1 = await PacienteModel.findOne({ cpf: CPF_VALIDO });
    expect(paciente1).not.toBeNull(); // não foi movido/apagado pela tentativa rejeitada
  });

  it('PUT /:id retorna 404 para paciente inexistente', async () => {
    const resposta = await request(app)
      .put('/api/v2/pacientes/id-inexistente')
      .set('Cookie', `token=${token}`)
      .send({ nome: 'Não importa' });

    expect(resposta.status).toBe(404);
  });

  it('DELETE /:id inativa (soft delete) um paciente existente', async () => {
    await PacienteModel.create({ _id: 'p3', nome: 'Paciente Ativo', cpf: CPF_VALIDO });

    const resposta = await request(app)
      .delete('/api/v2/pacientes/p3')
      .set('Cookie', `token=${token}`);

    expect(resposta.status).toBe(200);

    const atualizado = await PacienteModel.findOne({ cpf: CPF_VALIDO });
    expect(atualizado.ativo).toBe(false);
  });

  it('DELETE /:id retorna 404 para paciente inexistente', async () => {
    const resposta = await request(app)
      .delete('/api/v2/pacientes/id-inexistente')
      .set('Cookie', `token=${token}`);

    expect(resposta.status).toBe(404);
  });

  it('PUT /:id funciona com paciente legado cujo _id é um ObjectId nativo (não string), não só com UUID', async () => {
    const idLegado = new mongoose.Types.ObjectId();
    // insertOne bypassa o cast do schema (_id: String) — reproduz fielmente
    // como os 320 pacientes legados reais estão armazenados hoje no Atlas.
    await PacienteModel.collection.insertOne({ _id: idLegado, nome: 'Paciente Legado', cpf: CPF_VALIDO });

    const resposta = await request(app)
      .put(`/api/v2/pacientes/${idLegado.toString()}`)
      .set('Cookie', `token=${token}`)
      .send({ nome: 'Paciente Legado Atualizado' });

    expect(resposta.status).toBe(200);

    const salvo = await PacienteModel.findOne({ cpf: CPF_VALIDO });
    expect(salvo.nome).toBe('Paciente Legado Atualizado');
  });
});
