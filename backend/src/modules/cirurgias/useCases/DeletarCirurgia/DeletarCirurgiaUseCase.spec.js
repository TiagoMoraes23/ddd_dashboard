const DeletarCirurgiaUseCase = require('./DeletarCirurgiaUseCase');
const Cirurgia = require('../../domain/Cirurgia');
const { faker } = require('@faker-js/faker');

const mockCirurgiaRepository = {
  buscarPorId: jest.fn(),
  deletar: jest.fn(),
};

describe('UseCase: DeletarCirurgia', () => {
  let deletarCirurgiaUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    deletarCirurgiaUseCase = new DeletarCirurgiaUseCase(mockCirurgiaRepository);
  });

  it('deve lançar erro se o ID não for fornecido', async () => {
    await expect(deletarCirurgiaUseCase.execute(null)).rejects.toThrow('ID da cirurgia é obrigatório.');
    expect(mockCirurgiaRepository.buscarPorId).not.toHaveBeenCalled();
  });

  it('deve lançar erro se a cirurgia não for encontrada', async () => {
    mockCirurgiaRepository.buscarPorId.mockResolvedValue(null);

    await expect(deletarCirurgiaUseCase.execute('inexistente')).rejects.toThrow('Cirurgia não encontrada.');
    expect(mockCirurgiaRepository.deletar).not.toHaveBeenCalled();
  });

  it('deve apagar a cirurgia existente', async () => {
    const cirurgia = new Cirurgia({ id: faker.string.uuid(), pacienteId: faker.string.uuid() });
    mockCirurgiaRepository.buscarPorId.mockResolvedValue(cirurgia);

    await deletarCirurgiaUseCase.execute(cirurgia.id);

    expect(mockCirurgiaRepository.deletar).toHaveBeenCalledWith(cirurgia.id);
  });
});
