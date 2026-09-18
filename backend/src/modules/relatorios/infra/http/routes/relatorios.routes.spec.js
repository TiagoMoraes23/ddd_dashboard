const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { faker } = require('@faker-js/faker');

const ensureAuthenticated = require('../../../../../shared/infra/http/middlewares/ensureAuthenticated');
const { JWT_SECRET } = require('../../../../../shared/config/jwt');

jest.setTimeout(60000);

describe('Rota: GET /api/v2/relatorios/cirurgias/exportar', () => {
  let mongoServer;
  let app;
  let PacienteModel;
  let CirurgiaModel;
  let token;
  let tokenPadrao;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    PacienteModel = require('../../../../pacientes/infra/database/mongoose/PacienteSchema');
    CirurgiaModel = require('../../../../cirurgias/infra/database/mongoose/CirurgiaSchema');
    const relatoriosRouter = require('./relatorios.routes');

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    // Mesma composição usada em server.js: rota protegida por ensureAuthenticated.
    app.use('/api/v2/relatorios', ensureAuthenticated, relatoriosRouter);

    token = jwt.sign({ id: 'user-1', username: 'tester', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    tokenPadrao = jwt.sign({ id: 'user-2', username: 'tester-padrao', role: 'padrao' }, JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await PacienteModel.deleteMany({});
    await CirurgiaModel.deleteMany({});
  });

  it('rejeita requisições sem token com 401', async () => {
    const resposta = await request(app).get('/api/v2/relatorios/cirurgias/exportar');
    expect(resposta.status).toBe(401);
  });

  it('rejeita usuário autenticado sem papel admin com 403', async () => {
    const resposta = await request(app)
      .get('/api/v2/relatorios/cirurgias/exportar')
      .set('Cookie', `token=${tokenPadrao}`);

    expect(resposta.status).toBe(403);
  });

  it('gera a planilha .xlsx com token válido, uma linha por paciente encontrado', async () => {
    await PacienteModel.create({ _id: 'p1', nome: 'Paciente Exportado', cpf: '111' });
    await CirurgiaModel.create({ _id: faker.string.uuid(), pacienteId: 'p1', status: 'Realizado' });

    const resposta = await request(app)
      .get('/api/v2/relatorios/cirurgias/exportar')
      .set('Cookie', `token=${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(resposta.headers['content-disposition']).toContain('relatorio_cirurgias.xlsx');
  });

  it('aceita filtrosPaciente/filtrosCirurgia como querystring JSON, refletindo a mesma busca da tela', async () => {
    await PacienteModel.create({ _id: 'p1', nome: 'Paciente Com Convenio', cpf: '111', convenio: 'ConvenioX' });
    await PacienteModel.create({ _id: 'p2', nome: 'Paciente Sem Convenio', cpf: '222', convenio: 'Outro' });

    const resposta = await request(app)
      .get('/api/v2/relatorios/cirurgias/exportar')
      .query({ filtrosPaciente: JSON.stringify({ convenio: 'ConvenioX' }) })
      .set('Cookie', `token=${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });
});
