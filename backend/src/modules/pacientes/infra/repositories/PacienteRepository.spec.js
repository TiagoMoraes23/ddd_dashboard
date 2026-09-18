const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const PacienteRepository = require('./PacienteRepository');
const PacienteModel = require('../database/mongoose/PacienteSchema');
const Paciente = require('../../domain/Paciente');
const Cpf = require('../../domain/valueObjects/Cpf');
const { faker } = require('@faker-js/faker');

// Aumenta o timeout do Jest para 60 segundos.
jest.setTimeout(60000);

describe('Infra: PacienteRepository (Integration)', () => {
  let mongoServer;
  let repository;

  // Antes de todos os testes, sobe o servidor MongoDB em memória e conecta o Mongoose
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Após todos os testes, desconecta e derruba o servidor
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Antes de cada teste, instanciamos o repositório
  beforeEach(() => {
    repository = new PacienteRepository(PacienteModel);
  });

  // Após cada teste, limpamos a coleção para garantir isolamento entre os testes
  afterEach(async () => {
    await PacienteModel.deleteMany({});
  });

  // Helper para gerar um paciente de domínio válido
  const createFakePaciente = (cpfString = '52998224725') => {
    return new Paciente({
      id: faker.string.uuid(),
      nome: faker.person.fullName(),
      cpf: new Cpf(cpfString),
      convenio: 'Convenio A',
      dataRnm: faker.date.recent(),
    });
  };

  describe('Método: salvar()', () => {
    it('deve inserir um novo paciente no banco de dados', async () => {
      const paciente = createFakePaciente();

      await repository.salvar(paciente);

      // Vai direto no Mongoose para checar se salvou corretamente no formato esperado
      const doc = await PacienteModel.findById(paciente.id);
      expect(doc).not.toBeNull();
      expect(doc.nome).toBe(paciente.nome);
      expect(doc.cpf).toBe(paciente.cpf.getValue());
      expect(doc.convenio).toBe(paciente.convenio);
      expect(doc.dataRnm).toEqual(paciente.dataRnm);
    });

    it('deve atualizar um paciente existente (comportamento de upsert)', async () => {
      const paciente = createFakePaciente();
      await repository.salvar(paciente); // Insere

      // Modifica a entidade
      paciente.nome = 'Nome Alterado';
      paciente.convenio = 'Convenio B';
      await repository.salvar(paciente); // Atualiza

      const docs = await PacienteModel.find({ _id: paciente.id });
      expect(docs).toHaveLength(1); // Garante que não criou duplicata
      expect(docs[0].nome).toBe('Nome Alterado');
      expect(docs[0].convenio).toBe('Convenio B');
    });
  });

  describe('Métodos de Busca', () => {
    it('deve encontrar um paciente por CPF e retornar a Entidade de Domínio', async () => {
      const paciente = createFakePaciente();
      await repository.salvar(paciente);

      const foundPaciente = await repository.buscarPorCpf(paciente.cpf.getValue());

      expect(foundPaciente).not.toBeNull();
      expect(foundPaciente).toBeInstanceOf(Paciente);
      expect(foundPaciente.id).toBe(paciente.id);
    });

    it('deve retornar null se o CPF não existir na base', async () => {
      const foundPaciente = await repository.buscarPorCpf('11122233344');
      expect(foundPaciente).toBeNull();
    });

    it('deve encontrar um paciente por _id (UUID) e retornar a Entidade de Domínio', async () => {
      const paciente = createFakePaciente();
      await repository.salvar(paciente);

      const foundPaciente = await repository.buscarPorId(paciente.id);

      expect(foundPaciente).not.toBeNull();
      expect(foundPaciente).toBeInstanceOf(Paciente);
      expect(foundPaciente.cpf.getValue()).toBe(paciente.cpf.getValue());
    });

    it('deve encontrar por _id um paciente legado cujo _id é um ObjectId nativo, não uma string', async () => {
      const idLegado = new mongoose.Types.ObjectId();
      // insertOne bypassa o cast do schema (_id: String), reproduzindo como os
      // pacientes legados reais estão armazenados hoje (ver ADR 004).
      await PacienteModel.collection.insertOne({ _id: idLegado, nome: 'Legado', cpf: '11144477735' });

      const foundPaciente = await repository.buscarPorId(idLegado.toString());

      expect(foundPaciente).not.toBeNull();
      expect(foundPaciente.nome).toBe('Legado');
    });

    it('deve retornar null se o _id não existir na base', async () => {
      const foundPaciente = await repository.buscarPorId(faker.string.uuid());
      expect(foundPaciente).toBeNull();
    });

    it('findAll deve retornar todos os pacientes como Entidades de Domínio', async () => {
      await repository.salvar(createFakePaciente('52998224725'));
      await repository.salvar(createFakePaciente('11144477735'));

      const todos = await repository.findAll();

      expect(todos).toHaveLength(2);
      expect(todos.every((p) => p instanceof Paciente)).toBe(true);
    });
  });
});