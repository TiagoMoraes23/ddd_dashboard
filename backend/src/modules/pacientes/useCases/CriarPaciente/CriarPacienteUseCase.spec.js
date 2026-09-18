const CriarPacienteUseCase = require('./CriarPacienteUseCase');
const Paciente = require('../../domain/Paciente');
const { faker } = require('@faker-js/faker');

const mockPacienteRepository = {
  buscarPorCpf: jest.fn(),
  salvar: jest.fn(),
};

const gerarCpfValidoString = () => '52998224725';

describe('UseCase: CriarPaciente', () => {
  let criarPacienteUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    criarPacienteUseCase = new CriarPacienteUseCase(mockPacienteRepository);
  });

  describe('Cenários de Sucesso', () => {
    it('deve criar e salvar um paciente com sucesso', async () => {
      const cpfValido = gerarCpfValidoString();
      const requestData = {
        nome: faker.person.fullName(),
        cpf: cpfValido,
        convenio: 'Convenio A',
        contato: faker.phone.number(),
        observacoes: faker.lorem.sentence(),
        linkArquivos: faker.internet.url(),
        fornecedor: faker.company.name(),
        ultimosFornecedores: [faker.company.name()],
      };

      mockPacienteRepository.buscarPorCpf.mockResolvedValue(null);
      mockPacienteRepository.salvar.mockImplementation(paciente => Promise.resolve(paciente));

      const paciente = await criarPacienteUseCase.execute(requestData);

      expect(paciente).toBeInstanceOf(Paciente);
      expect(paciente.nome).toBe(requestData.nome);
      expect(paciente.cpf.getValue()).toBe(cpfValido);
      
      expect(mockPacienteRepository.buscarPorCpf).toHaveBeenCalledWith(cpfValido);
      expect(mockPacienteRepository.salvar).toHaveBeenCalledWith(paciente);
    });
  });

  describe('Cenários de Falha', () => {
    it('deve lançar um erro se o CPF já estiver cadastrado no sistema', async () => {
      const requestData = {
        nome: faker.person.fullName(),
        cpf: gerarCpfValidoString(),
        convenio: 'Convenio B',
        contato: faker.phone.number(),
      };

      mockPacienteRepository.buscarPorCpf.mockResolvedValue({ id: '123-existente' });

      await expect(criarPacienteUseCase.execute(requestData)).rejects.toThrow('Já existe um paciente cadastrado com este CPF.');
      expect(mockPacienteRepository.salvar).not.toHaveBeenCalled();
    });

    it('deve repassar o erro do Domínio se o CPF fornecido for inválido', async () => {
      const requestData = {
        nome: faker.person.fullName(),
        cpf: '11111111111',
      };

      await expect(criarPacienteUseCase.execute(requestData)).rejects.toThrow('CPF inválido fornecido.');
      expect(mockPacienteRepository.buscarPorCpf).not.toHaveBeenCalled(); // Falha antes de chegar no DB
    });
  });
});