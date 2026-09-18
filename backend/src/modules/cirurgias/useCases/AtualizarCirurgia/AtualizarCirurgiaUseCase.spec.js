const AtualizarCirurgiaUseCase = require('./AtualizarCirurgiaUseCase');
const Cirurgia = require('../../domain/Cirurgia');
const { faker } = require('@faker-js/faker');

const mockCirurgiaRepository = {
  buscarPorId: jest.fn(),
  salvar: jest.fn(),
};

describe('UseCase: AtualizarCirurgia', () => {
  let atualizarCirurgiaUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    atualizarCirurgiaUseCase = new AtualizarCirurgiaUseCase(mockCirurgiaRepository);
  });

  const criarCirurgiaFake = (overrides = {}) => new Cirurgia({
    id: faker.string.uuid(),
    pacienteId: faker.string.uuid(),
    descricao: 'Cirurgia de teste',
    status: 'Autorizado',
    ...overrides,
  });

  it('deve lançar erro se o ID não for fornecido', async () => {
    await expect(atualizarCirurgiaUseCase.execute(null, { descricao: 'x' }))
      .rejects.toThrow('ID da cirurgia é obrigatório.');

    expect(mockCirurgiaRepository.buscarPorId).not.toHaveBeenCalled();
  });

  it('deve lançar erro se a cirurgia não for encontrada', async () => {
    mockCirurgiaRepository.buscarPorId.mockResolvedValue(null);

    await expect(atualizarCirurgiaUseCase.execute('inexistente', { descricao: 'x' }))
      .rejects.toThrow('Cirurgia não encontrada.');

    expect(mockCirurgiaRepository.salvar).not.toHaveBeenCalled();
  });

  it('deve buscar a cirurgia, atualizar os campos informados via entidade de domínio e salvar', async () => {
    const cirurgia = criarCirurgiaFake();
    mockCirurgiaRepository.buscarPorId.mockResolvedValue(cirurgia);
    mockCirurgiaRepository.salvar.mockImplementation((c) => Promise.resolve(c));

    const dadosAtualizacao = {
      descricao: 'Nova descrição',
      hospital: 'Hospital Novo',
      regiao: ['Ombro', 'Cotovelo'],
      data: '2026-08-01',
      horario: '14:00',
    };

    const resultado = await atualizarCirurgiaUseCase.execute(cirurgia.id, dadosAtualizacao);

    expect(mockCirurgiaRepository.buscarPorId).toHaveBeenCalledWith(cirurgia.id);
    expect(mockCirurgiaRepository.salvar).toHaveBeenCalledWith(cirurgia);
    expect(resultado.descricao).toBe('Nova descrição');
    expect(resultado.hospital).toBe('Hospital Novo');
    expect(resultado.regiao).toEqual(['Ombro', 'Cotovelo']);
    expect(resultado.horario).toBe('14:00');
  });

  it('deve propagar o erro da entidade de domínio para um status inválido', async () => {
    const cirurgia = criarCirurgiaFake();
    mockCirurgiaRepository.buscarPorId.mockResolvedValue(cirurgia);

    await expect(atualizarCirurgiaUseCase.execute(cirurgia.id, { status: 'StatusInvalido' }))
      .rejects.toThrow('Status de cirurgia inválido: StatusInvalido');

    expect(mockCirurgiaRepository.salvar).not.toHaveBeenCalled();
  });
});
