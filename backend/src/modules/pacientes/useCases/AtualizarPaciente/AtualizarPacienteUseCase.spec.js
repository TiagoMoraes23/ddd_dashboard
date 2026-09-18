const AtualizarPacienteUseCase = require('./AtualizarPacienteUseCase');
const Paciente = require('../../domain/Paciente');
const Cpf = require('../../domain/valueObjects/Cpf');
const { faker } = require('@faker-js/faker');

// CPFs válidos usados de forma consistente nos testes
const CPF_ORIGINAL = '52998224725';
const CPF_NOVO = '11144477735';

const mockPacienteRepository = {
  buscarPorId: jest.fn(),
  buscarPorCpf: jest.fn(),
  salvar: jest.fn(),
};

// Helper para instanciar uma entidade de domínio já persistida
const criarPacienteExistente = (overrides = {}) =>
  new Paciente({
    id: faker.string.uuid(),
    nome: faker.person.fullName(),
    cpf: new Cpf(CPF_ORIGINAL),
    convenio: 'Convenio Original',
    contato: faker.phone.number(),
    ...overrides,
  });

describe('UseCase: AtualizarPaciente', () => {
  let atualizarPacienteUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    atualizarPacienteUseCase = new AtualizarPacienteUseCase(mockPacienteRepository);
    // Por padrão, o salvar apenas devolve a entidade recebida
    mockPacienteRepository.salvar.mockImplementation(paciente => Promise.resolve(paciente));
  });

  describe('Construção', () => {
    it('deve lançar erro se o repositório não tiver os métodos obrigatórios', () => {
      expect(() => new AtualizarPacienteUseCase(null)).toThrow(
        'A dependência pacienteRepository (com os métodos buscarPorId, buscarPorCpf e salvar) é obrigatória.'
      );
      expect(() => new AtualizarPacienteUseCase({ buscarPorId: jest.fn(), salvar: jest.fn() })).toThrow();
    });
  });

  describe('Cenários de Sucesso', () => {
    it('deve atualizar os dados e persistir a entidade usando o CPF original como chave', async () => {
      const paciente = criarPacienteExistente();
      mockPacienteRepository.buscarPorId.mockResolvedValue(paciente);

      const resultado = await atualizarPacienteUseCase.execute(paciente.id, {
        nome: 'Nome Atualizado',
        convenio: 'Convenio Novo',
      });

      expect(resultado).toBeInstanceOf(Paciente);
      expect(resultado.nome).toBe('Nome Atualizado');
      expect(resultado.convenio).toBe('Convenio Novo');
      expect(mockPacienteRepository.buscarPorId).toHaveBeenCalledWith(paciente.id);
      expect(mockPacienteRepository.salvar).toHaveBeenCalledWith(paciente, CPF_ORIGINAL);
    });

    it('não deve checar unicidade de CPF quando o CPF não muda', async () => {
      const paciente = criarPacienteExistente();
      mockPacienteRepository.buscarPorId.mockResolvedValue(paciente);

      await atualizarPacienteUseCase.execute(paciente.id, { nome: 'Outro Nome' });

      expect(mockPacienteRepository.buscarPorCpf).not.toHaveBeenCalled();
      expect(mockPacienteRepository.salvar).toHaveBeenCalledWith(paciente, CPF_ORIGINAL);
    });

    it('deve permitir trocar o CPF quando o novo valor não pertence a outro paciente', async () => {
      const paciente = criarPacienteExistente();
      mockPacienteRepository.buscarPorId.mockResolvedValue(paciente);
      mockPacienteRepository.buscarPorCpf.mockResolvedValue(null);

      const resultado = await atualizarPacienteUseCase.execute(paciente.id, { cpf: CPF_NOVO });

      expect(mockPacienteRepository.buscarPorCpf).toHaveBeenCalledWith(CPF_NOVO);
      expect(resultado.cpf.getValue()).toBe(CPF_NOVO);
      // Persiste localizando o documento pelo CPF antigo
      expect(mockPacienteRepository.salvar).toHaveBeenCalledWith(paciente, CPF_ORIGINAL);
    });
  });

  describe('Cenários de Falha', () => {
    it('deve lançar erro se o paciente não for encontrado', async () => {
      mockPacienteRepository.buscarPorId.mockResolvedValue(null);

      await expect(atualizarPacienteUseCase.execute('id-inexistente', { nome: 'X' })).rejects.toThrow(
        'Paciente não encontrado'
      );
      expect(mockPacienteRepository.salvar).not.toHaveBeenCalled();
    });

    it('deve lançar erro ao trocar o CPF para um já cadastrado em outro paciente', async () => {
      const paciente = criarPacienteExistente();
      mockPacienteRepository.buscarPorId.mockResolvedValue(paciente);
      mockPacienteRepository.buscarPorCpf.mockResolvedValue({ id: 'outro-paciente' });

      await expect(atualizarPacienteUseCase.execute(paciente.id, { cpf: CPF_NOVO })).rejects.toThrow(
        'Já existe um paciente cadastrado com este CPF.'
      );
      expect(mockPacienteRepository.salvar).not.toHaveBeenCalled();
    });

    it('deve repassar o erro do domínio quando o CPF informado for inválido', async () => {
      const paciente = criarPacienteExistente();
      mockPacienteRepository.buscarPorId.mockResolvedValue(paciente);

      await expect(atualizarPacienteUseCase.execute(paciente.id, { cpf: '11111111111' })).rejects.toThrow(
        'CPF inválido fornecido.'
      );
      expect(mockPacienteRepository.buscarPorCpf).not.toHaveBeenCalled();
      expect(mockPacienteRepository.salvar).not.toHaveBeenCalled();
    });
  });
});
