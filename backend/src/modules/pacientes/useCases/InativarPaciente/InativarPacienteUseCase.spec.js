const InativarPacienteUseCase = require('./InativarPacienteUseCase');
const Paciente = require('../../domain/Paciente');
const Cpf = require('../../domain/valueObjects/Cpf');
const { faker } = require('@faker-js/faker');

const CPF_VALIDO = '52998224725';

const mockPacienteRepository = {
  buscarPorId: jest.fn(),
  salvar: jest.fn(),
};

const criarPacienteExistente = (overrides = {}) =>
  new Paciente({
    id: faker.string.uuid(),
    nome: faker.person.fullName(),
    cpf: new Cpf(CPF_VALIDO),
    ...overrides,
  });

describe('UseCase: InativarPaciente', () => {
  let inativarPacienteUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    inativarPacienteUseCase = new InativarPacienteUseCase(mockPacienteRepository);
    mockPacienteRepository.salvar.mockImplementation(paciente => Promise.resolve(paciente));
  });

  describe('Construção', () => {
    it('deve lançar erro se o repositório não tiver os métodos obrigatórios', () => {
      expect(() => new InativarPacienteUseCase(null)).toThrow(
        'A dependência pacienteRepository (com os métodos buscarPorId e salvar) é obrigatória.'
      );
      expect(() => new InativarPacienteUseCase({ buscarPorId: jest.fn() })).toThrow();
    });
  });

  describe('Cenários de Sucesso', () => {
    it('deve inativar o paciente e persistir a entidade', async () => {
      const paciente = criarPacienteExistente();
      mockPacienteRepository.buscarPorId.mockResolvedValue(paciente);

      const mensagem = await inativarPacienteUseCase.execute(paciente.id);

      expect(mensagem).toBe('Paciente inativado com sucesso');
      expect(paciente.ativo).toBe(false);
      expect(mockPacienteRepository.buscarPorId).toHaveBeenCalledWith(paciente.id);
      expect(mockPacienteRepository.salvar).toHaveBeenCalledWith(paciente);
    });
  });

  describe('Cenários de Falha', () => {
    it('deve lançar erro se o paciente não for encontrado', async () => {
      mockPacienteRepository.buscarPorId.mockResolvedValue(null);

      await expect(inativarPacienteUseCase.execute('id-inexistente')).rejects.toThrow('Paciente não encontrado');
      expect(mockPacienteRepository.salvar).not.toHaveBeenCalled();
    });

    it('deve repassar o erro do domínio ao inativar um paciente já inativo', async () => {
      const paciente = criarPacienteExistente({ ativo: false });
      mockPacienteRepository.buscarPorId.mockResolvedValue(paciente);

      await expect(inativarPacienteUseCase.execute(paciente.id)).rejects.toThrow(
        'O paciente já se encontra inativo.'
      );
      expect(mockPacienteRepository.salvar).not.toHaveBeenCalled();
    });
  });
});
