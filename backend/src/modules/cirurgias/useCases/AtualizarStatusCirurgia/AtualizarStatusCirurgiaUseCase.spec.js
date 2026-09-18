const AtualizarStatusCirurgiaUseCase = require('./AtualizarStatusCirurgiaUseCase');
const Cirurgia = require('../../domain/Cirurgia');
const { faker } = require('@faker-js/faker');

const mockCirurgiaRepository = {
  buscarPorId: jest.fn(),
  salvar: jest.fn(),
};

describe('UseCase: AtualizarStatusCirurgia', () => {
  let atualizarStatusCirurgiaUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    atualizarStatusCirurgiaUseCase = new AtualizarStatusCirurgiaUseCase(mockCirurgiaRepository);
  });

  const criarCirurgiaFake = (overrides = {}) => new Cirurgia({
    id: faker.string.uuid(),
    pacienteId: faker.string.uuid(),
    descricao: 'Cirurgia de teste',
    status: 'Agendado',
    ...overrides,
  });

  it('deve lançar erro se id ou status não forem fornecidos', async () => {
    await expect(atualizarStatusCirurgiaUseCase.execute({ id: null, status: 'Realizado' }))
      .rejects.toThrow('ID da cirurgia e novo status são obrigatórios.');
    await expect(atualizarStatusCirurgiaUseCase.execute({ id: 'algum-id', status: null }))
      .rejects.toThrow('ID da cirurgia e novo status são obrigatórios.');

    expect(mockCirurgiaRepository.buscarPorId).not.toHaveBeenCalled();
  });

  it('deve lançar erro se a cirurgia não for encontrada', async () => {
    mockCirurgiaRepository.buscarPorId.mockResolvedValue(null);

    await expect(atualizarStatusCirurgiaUseCase.execute({ id: 'inexistente', status: 'Realizado' }))
      .rejects.toThrow('Cirurgia não encontrada.');

    expect(mockCirurgiaRepository.salvar).not.toHaveBeenCalled();
  });

  it('deve buscar a cirurgia, atualizar o status via entidade de domínio e salvar', async () => {
    const cirurgia = criarCirurgiaFake({ status: 'Agendado' });
    mockCirurgiaRepository.buscarPorId.mockResolvedValue(cirurgia);
    mockCirurgiaRepository.salvar.mockImplementation((c) => Promise.resolve(c));

    const resultado = await atualizarStatusCirurgiaUseCase.execute({ id: cirurgia.id, status: 'Realizado' });

    expect(mockCirurgiaRepository.buscarPorId).toHaveBeenCalledWith(cirurgia.id);
    expect(mockCirurgiaRepository.salvar).toHaveBeenCalledWith(cirurgia);
    expect(resultado.status.getValue()).toBe('Realizado');
  });

  it('deve propagar o erro da entidade de domínio para um status inválido', async () => {
    const cirurgia = criarCirurgiaFake({ status: 'Agendado' });
    mockCirurgiaRepository.buscarPorId.mockResolvedValue(cirurgia);

    await expect(atualizarStatusCirurgiaUseCase.execute({ id: cirurgia.id, status: 'StatusQueNaoExiste' }))
      .rejects.toThrow('Status de cirurgia inválido: StatusQueNaoExiste');

    expect(mockCirurgiaRepository.salvar).not.toHaveBeenCalled();
  });
});
