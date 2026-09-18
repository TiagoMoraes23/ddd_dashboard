const Usuario = require('./Usuario');
const Role = require('./valueObjects/Role');
const { faker } = require('@faker-js/faker');

describe('Domain Entity: Usuario', () => {
  describe('Criação da Entidade', () => {
    it('deve criar um usuário com sucesso quando dados válidos forem fornecidos', () => {
      const dados = { id: faker.string.uuid(), username: 'tiago', role: new Role('admin') };

      const usuario = new Usuario(dados);

      expect(usuario.id).toBe(dados.id);
      expect(usuario.username).toBe('tiago');
      expect(usuario.role).toBeInstanceOf(Role);
    });

    it('deve lançar erro se o ID não for fornecido', () => {
      expect(() => new Usuario({ username: 'tiago', role: new Role('admin') }))
        .toThrow('ID é obrigatório para instanciar um Usuario.');
    });

    it('deve lançar erro se o username não for fornecido', () => {
      expect(() => new Usuario({ id: '1', role: new Role('admin') }))
        .toThrow('Username é obrigatório.');
    });

    it('deve lançar erro se a role não for uma instância do Value Object Role', () => {
      expect(() => new Usuario({ id: '1', username: 'tiago', role: 'admin' }))
        .toThrow('A role deve ser uma instância do Value Object Role.');
    });
  });

  describe('isAdmin()', () => {
    it('deve retornar true para role admin', () => {
      const usuario = new Usuario({ id: '1', username: 'tiago', role: new Role('admin') });
      expect(usuario.isAdmin()).toBe(true);
    });

    it('deve retornar false para role padrao', () => {
      const usuario = new Usuario({ id: '1', username: 'user', role: new Role('padrao') });
      expect(usuario.isAdmin()).toBe(false);
    });
  });

  describe('paraJSON()', () => {
    it('deve retornar id, username e role em formato simples, sem senha', () => {
      const usuario = new Usuario({ id: '1', username: 'tiago', role: new Role('admin') });
      expect(usuario.paraJSON()).toEqual({ id: '1', username: 'tiago', role: 'admin' });
    });
  });
});
