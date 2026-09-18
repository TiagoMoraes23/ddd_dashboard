const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const CirurgiaRepository = require('./CirurgiaRepository');
const CirurgiaModel = require('../database/mongoose/CirurgiaSchema');
const Cirurgia = require('../../domain/Cirurgia');
const { faker } = require('@faker-js/faker');

// Aumenta o timeout padrão do Jest para lidar com o setup do DB em memória.
jest.setTimeout(60000);

describe('Infra: CirurgiaRepository (Integration)', () => {
  let mongoServer;
  let repository;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    repository = new CirurgiaRepository(CirurgiaModel);
  });

  afterEach(async () => {
    await CirurgiaModel.deleteMany({});
  });

  // Helper para criar uma entidade de domínio Cirurgia válida
  const createFakeCirurgia = (overrides = {}) => {
    const defaults = {
      id: faker.string.uuid(),
      pacienteId: faker.string.uuid(),
      descricao: 'Cirurgia de teste',
      status: 'Agendamento Pendente',
      data: faker.date.future(),
      horario: '10:00',
    };
    return new Cirurgia({ ...defaults, ...overrides });
  };

  describe('Método: salvar()', () => {
    it('deve inserir uma nova cirurgia no banco de dados', async () => {
      const cirurgia = createFakeCirurgia();

      await repository.salvar(cirurgia);

      const doc = await CirurgiaModel.findById(cirurgia.id);
      expect(doc).not.toBeNull();
      expect(doc.id).toBe(cirurgia.id);
      expect(doc.descricao).toBe(cirurgia.descricao);
      expect(doc.status).toBe('Agendamento Pendente');
    });

    it('deve atualizar uma cirurgia existente (comportamento de upsert)', async () => {
      const cirurgia = createFakeCirurgia();
      await repository.salvar(cirurgia); // Insere

      // Modifica a entidade
      cirurgia.descricao = 'Descrição Alterada';
      cirurgia.agendar(new Date(), '15:00'); // Muda o status para 'Agendado'

      await repository.salvar(cirurgia); // Atualiza

      const doc = await CirurgiaModel.findById(cirurgia.id);
      expect(doc.descricao).toBe('Descrição Alterada');
      expect(doc.status).toBe('Agendado');
      expect(doc.horario).toBe('15:00');
    });
  });

  describe('Método: buscarPorId()', () => {
    it('deve retornar a cirurgia reconstruída como entidade de domínio', async () => {
      const cirurgia = createFakeCirurgia({ regiao: ['Ombro'] });
      await repository.salvar(cirurgia);

      const encontrada = await repository.buscarPorId(cirurgia.id);

      expect(encontrada).toBeInstanceOf(Cirurgia);
      expect(encontrada.id).toBe(cirurgia.id);
      expect(encontrada.regiao).toEqual(['Ombro']);
      expect(encontrada.status.getValue()).toBe(cirurgia.status.getValue());
    });

    it('deve retornar null se a cirurgia não existir', async () => {
      const encontrada = await repository.buscarPorId(faker.string.uuid());
      expect(encontrada).toBeNull();
    });
  });

  describe('Método: deletar()', () => {
    it('deve apagar a cirurgia do banco de dados', async () => {
      const cirurgia = createFakeCirurgia();
      await repository.salvar(cirurgia);

      await repository.deletar(cirurgia.id);

      const doc = await CirurgiaModel.findById(cirurgia.id);
      expect(doc).toBeNull();
    });

    it('não deve lançar erro ao tentar apagar um ID inexistente', async () => {
      await expect(repository.deletar(faker.string.uuid())).resolves.not.toThrow();
    });
  });

  describe('Método: buscarPorDataEStatus()', () => {
    it('deve encontrar cirurgias na data e com o status especificados', async () => {
      const dataBusca = new Date('2026-08-15T12:00:00.000Z');

      // Cirurgia que deve ser encontrada
      const cirurgia1 = createFakeCirurgia({ status: 'Agendado', data: new Date('2026-08-15T10:00:00.000Z') });
      await repository.salvar(cirurgia1);

      // Cirurgia que não deve ser encontrada (data diferente)
      const cirurgia2 = createFakeCirurgia({ status: 'Agendado', data: new Date('2026-08-16T10:00:00.000Z') });
      await repository.salvar(cirurgia2);

      // Cirurgia que não deve ser encontrada (status diferente)
      const cirurgia3 = createFakeCirurgia({ status: 'Cancelado (outro motivo)', data: new Date('2026-08-15T14:00:00.000Z') });
      await repository.salvar(cirurgia3);

      const resultados = await repository.buscarPorDataEStatus(dataBusca, 'Agendado');

      expect(resultados).toHaveLength(1);
      expect(resultados[0]._id.toString()).toBe(cirurgia1.id);
    });

    it('deve retornar um array vazio se nenhuma cirurgia corresponder', async () => {
      const dataBusca = new Date('2099-01-01T12:00:00.000Z');
      const resultados = await repository.buscarPorDataEStatus(dataBusca, 'Agendado');
      expect(resultados).toEqual([]);
    });

    it('deve encontrar todas as cirurgias do dia, independentemente do horário', async () => {
      const dataBusca = new Date('2026-09-20T12:00:00.000Z');
      const cirurgiaManha = createFakeCirurgia({ status: 'Agendado', data: new Date('2026-09-20T08:00:00.000Z') });
      const cirurgiaTarde = createFakeCirurgia({ status: 'Agendado', data: new Date('2026-09-20T18:00:00.000Z') });
      await repository.salvar(cirurgiaManha);
      await repository.salvar(cirurgiaTarde);

      const resultados = await repository.buscarPorDataEStatus(dataBusca, 'Agendado');

      expect(resultados).toHaveLength(2);
    });
  });
});