const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const ensureAuthenticated = require('../../../../../shared/infra/http/middlewares/ensureAuthenticated');
const { JWT_SECRET } = require('../../../../../shared/config/jwt');

jest.setTimeout(60000);

function gerarToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Rotas: /api/v2/usuarios', () => {
  let mongoServer;
  let app;
  let UsuarioModel;
  let tokenAdmin;
  let tokenPadrao;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    UsuarioModel = require('../../database/mongoose/UsuarioSchema');
    const usuariosRouter = require('./usuarios.routes');

    app = express();
    app.use(express.json());
    app.use(cookieParser());
    // Mesma composição usada em server.js: ensureAuthenticated no mount, mais
    // ensureAdmin aplicado dentro do próprio router (gestão de usuários é
    // restrita a admins, ver usuarios.routes.js).
    app.use('/api/v2/usuarios', ensureAuthenticated, usuariosRouter);

    tokenAdmin = gerarToken({ id: 'admin-fake-id', username: 'admin-teste', role: 'admin' });
    tokenPadrao = gerarToken({ id: 'padrao-fake-id', username: 'padrao-teste', role: 'padrao' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await UsuarioModel.deleteMany({});
  });

  it('rejeita requisições sem token com 401', async () => {
    const resposta = await request(app).get('/api/v2/usuarios');
    expect(resposta.status).toBe(401);
  });

  it('rejeita usuário autenticado sem role admin com 403', async () => {
    const resposta = await request(app).get('/api/v2/usuarios').set('Cookie', `token=${tokenPadrao}`);
    expect(resposta.status).toBe(403);
  });

  it('GET / lista os usuários para um admin autenticado, sem expor a senha', async () => {
    await UsuarioModel.create({ username: 'usuario-a', password: 'senha123', role: 'padrao' });

    const resposta = await request(app).get('/api/v2/usuarios').set('Cookie', `token=${tokenAdmin}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].password).toBeUndefined();
  });

  it('POST / cria um usuário novo', async () => {
    const resposta = await request(app)
      .post('/api/v2/usuarios')
      .set('Cookie', `token=${tokenAdmin}`)
      .send({ username: 'usuario-novo', password: 'senha123', role: 'padrao' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.username).toBe('usuario-novo');
    expect(await UsuarioModel.findOne({ username: 'usuario-novo' })).not.toBeNull();
  });

  it('PUT /:id atualiza a role de um usuário existente', async () => {
    const criado = await UsuarioModel.create({ username: 'usuario-b', password: 'senha123', role: 'padrao' });

    const resposta = await request(app)
      .put(`/api/v2/usuarios/${criado._id}`)
      .set('Cookie', `token=${tokenAdmin}`)
      .send({ role: 'admin' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.role).toBe('admin');
  });

  it('DELETE /:id apaga um usuário existente', async () => {
    const criado = await UsuarioModel.create({ username: 'usuario-c', password: 'senha123', role: 'padrao' });

    const resposta = await request(app)
      .delete(`/api/v2/usuarios/${criado._id}`)
      .set('Cookie', `token=${tokenAdmin}`);

    expect(resposta.status).toBe(200);
    expect(await UsuarioModel.findById(criado._id)).toBeNull();
  });

  it('DELETE /:id bloqueia a auto-exclusão do usuário logado', async () => {
    const criado = await UsuarioModel.create({ username: 'usuario-proprio', password: 'senha123', role: 'admin' });
    const tokenProprio = gerarToken({ id: criado._id.toString(), username: 'usuario-proprio', role: 'admin' });

    const resposta = await request(app)
      .delete(`/api/v2/usuarios/${criado._id}`)
      .set('Cookie', `token=${tokenProprio}`);

    expect(resposta.status).toBe(400);
    expect(await UsuarioModel.findById(criado._id)).not.toBeNull();
  });
});
