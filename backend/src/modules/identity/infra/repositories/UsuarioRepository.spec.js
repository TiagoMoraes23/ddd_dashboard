const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const UsuarioRepository = require('./UsuarioRepository');
const UsuarioModel = require('../database/mongoose/UsuarioSchema');

jest.setTimeout(60000);

describe('Infra: UsuarioRepository (Integration)', () => {
  let mongoServer;
  let repository;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    repository = new UsuarioRepository();
  });

  afterEach(async () => {
    await UsuarioModel.deleteMany({});
  });

  it('deve criar um usuário com a senha hasheada (hook pre-save do schema)', async () => {
    const criado = await repository.criar({ username: 'tiago', password: 'senha123', role: 'admin' });

    expect(criado.password).not.toBe('senha123');
    expect(await bcrypt.compare('senha123', criado.password)).toBe(true);
  });

  it('buscarPorUsuario deve retornar o documento com a senha incluída', async () => {
    await repository.criar({ username: 'tiago', password: 'senha123', role: 'admin' });

    const encontrado = await repository.buscarPorUsuario('tiago');

    expect(encontrado).not.toBeNull();
    expect(encontrado.password).toBeDefined();
  });

  it('listarTodos deve retornar todos os usuários ordenados por username', async () => {
    await repository.criar({ username: 'zeta', password: 'senha123', role: 'padrao' });
    await repository.criar({ username: 'alfa', password: 'senha123', role: 'padrao' });

    const lista = await repository.listarTodos();

    expect(lista.map((u) => u.username)).toEqual(['alfa', 'zeta']);
  });

  it('atualizar deve trocar a role sem exigir nova senha', async () => {
    const criado = await repository.criar({ username: 'tiago', password: 'senha123', role: 'padrao' });

    const atualizado = await repository.atualizar(criado._id.toString(), { role: 'admin' });

    expect(atualizado.role).toBe('admin');
    expect(await bcrypt.compare('senha123', atualizado.password)).toBe(true);
  });

  it('atualizar deve trocar o username sem exigir role ou senha', async () => {
    const criado = await repository.criar({ username: 'nome-antigo', password: 'senha123', role: 'padrao' });

    const atualizado = await repository.atualizar(criado._id.toString(), { username: 'nome-novo' });

    expect(atualizado.username).toBe('nome-novo');
  });

  it('atualizar deve retornar null se o usuário não existir', async () => {
    const idInexistente = new mongoose.Types.ObjectId().toString();

    const resultado = await repository.atualizar(idInexistente, { role: 'admin' });

    expect(resultado).toBeNull();
  });

  it('atualizar deve re-hashear a senha quando uma nova for fornecida', async () => {
    const criado = await repository.criar({ username: 'tiago', password: 'senha-antiga', role: 'padrao' });

    const atualizado = await repository.atualizar(criado._id.toString(), { password: 'senha-nova' });

    expect(await bcrypt.compare('senha-nova', atualizado.password)).toBe(true);
    expect(await bcrypt.compare('senha-antiga', atualizado.password)).toBe(false);
  });

  it('deletar deve remover o usuário', async () => {
    const criado = await repository.criar({ username: 'tiago', password: 'senha123', role: 'padrao' });

    await repository.deletar(criado._id.toString());

    expect(await repository.buscarPorId(criado._id.toString())).toBeNull();
  });
});
