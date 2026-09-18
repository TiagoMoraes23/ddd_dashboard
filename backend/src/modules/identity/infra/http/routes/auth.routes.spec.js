const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(60000);

describe('Rota: POST /api/v2/auth/login', () => {
  let mongoServer;
  let app;
  let UsuarioModel;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    UsuarioModel = require('../../database/mongoose/UsuarioSchema');
    const authRouter = require('./auth.routes');

    app = express();
    app.use(express.json());
    // Pública em server.js (sem ensureAuthenticated) — é o próprio ponto de entrada da sessão.
    app.use('/api/v2/auth', authRouter);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await UsuarioModel.deleteMany({});
  });

  it('autentica com credenciais válidas, devolve { usuario } e o token só via cookie httpOnly', async () => {
    await UsuarioModel.create({ username: 'tester', password: 'senha123', role: 'admin' });

    const resposta = await request(app)
      .post('/api/v2/auth/login')
      .send({ username: 'tester', password: 'senha123' });

    expect(resposta.status).toBe(200);
    // Contrato aninhado (ver ADR 003): {usuario: {...}}, não achatado como o
    // legado. O token nunca vai no corpo — só no cookie httpOnly, pra não
    // ficar acessível a JavaScript no navegador (mitiga roubo via XSS).
    expect(resposta.body).toEqual({ usuario: { id: expect.any(String), username: 'tester', role: 'admin' } });

    const setCookie = resposta.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieToken = setCookie.find((c) => c.startsWith('token='));
    expect(cookieToken).toBeDefined();
    expect(cookieToken).toMatch(/HttpOnly/i);
  });

  it('rejeita senha incorreta com 401', async () => {
    await UsuarioModel.create({ username: 'tester', password: 'senha123', role: 'admin' });

    const resposta = await request(app)
      .post('/api/v2/auth/login')
      .send({ username: 'tester', password: 'senha-errada' });

    expect(resposta.status).toBe(401);
  });

  it('rejeita usuário inexistente com 401', async () => {
    const resposta = await request(app)
      .post('/api/v2/auth/login')
      .send({ username: 'nao-existe', password: 'qualquer' });

    expect(resposta.status).toBe(401);
  });
});

describe('Rota: POST /api/v2/auth/logout', () => {
  let app;

  beforeAll(() => {
    const authRouter = require('./auth.routes');
    app = express();
    app.use(express.json());
    app.use('/api/v2/auth', authRouter);
  });

  it('limpa o cookie de autenticação', async () => {
    const resposta = await request(app).post('/api/v2/auth/logout');

    expect(resposta.status).toBe(200);

    const setCookie = resposta.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieToken = setCookie.find((c) => c.startsWith('token='));
    expect(cookieToken).toBeDefined();
    // clearCookie expira o cookie no passado — não tem o valor original nele.
    expect(cookieToken).toMatch(/token=;/);
  });
});
