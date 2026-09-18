const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const ensureAuthenticated = require('../../../../../shared/infra/http/middlewares/ensureAuthenticated');
const { JWT_SECRET } = require('../../../../../shared/config/jwt');

jest.setTimeout(60000);

describe('Rotas: /api/v2/dashboard', () => {
  let mongoServer;
  let app;
  let PacienteModel;
  let token;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    PacienteModel = require('../../../../pacientes/infra/database/mongoose/PacienteSchema');
    const dashboardRouter = require('./dashboard.routes');

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    // Mesma composição usada em server.js: rota protegida por ensureAuthenticated.
    app.use('/api/v2/dashboard', ensureAuthenticated, dashboardRouter);

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
    const resposta = await request(app).get('/api/v2/dashboard/stats');
    expect(resposta.status).toBe(401);
  });

  it('GET /stats retorna os KPIs com token válido', async () => {
    const resposta = await request(app).get('/api/v2/dashboard/stats').set('Cookie', `token=${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      autorizados: 0,
      agendados: 0,
      agendamentoPendente: 0,
      rnmVencidas: 0,
      solicitarNovaRnm: 0,
      reentrada: 0,
    });
  });

  it('GET /kpi/:kpiName retorna o drilldown de pacientes por trás do KPI', async () => {
    const maisDeUmAnoAtras = new Date();
    maisDeUmAnoAtras.setFullYear(maisDeUmAnoAtras.getFullYear() - 2);
    await PacienteModel.create({ _id: 'p1', nome: 'Paciente RNM Vencida', cpf: '111', dataRnm: maisDeUmAnoAtras });
    await PacienteModel.create({ _id: 'p2', nome: 'Paciente RNM Em Dia', cpf: '222', dataRnm: new Date() });

    const resposta = await request(app).get('/api/v2/dashboard/kpi/rnmVencidas').set('Cookie', `token=${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].nome).toBe('Paciente RNM Vencida');
  });

  it('GET /kpi/:kpiName retorna 400 para um nome de KPI inválido', async () => {
    const resposta = await request(app)
      .get('/api/v2/dashboard/kpi/kpiQueNaoExiste')
      .set('Cookie', `token=${token}`);

    expect(resposta.status).toBe(400);
  });
});
