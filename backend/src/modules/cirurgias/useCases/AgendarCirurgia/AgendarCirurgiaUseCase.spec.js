const AgendarCirurgiaUseCase = require('./AgendarCirurgiaUseCase');
const Cirurgia = require('../../domain/Cirurgia');
const EventBus = require('../../../../shared/infra/events/EventBus');
const { faker } = require('@faker-js/faker');

// Mocks para as dependências externas do Use Case
const mockCirurgiaRepository = {
  salvar: jest.fn(),
};
const mockVerificadorConflito = {
  verificarConflito: jest.fn(),
};

describe('UseCase: AgendarCirurgia', () => {
  let agendarCirurgiaUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    agendarCirurgiaUseCase = new AgendarCirurgiaUseCase(mockCirurgiaRepository, mockVerificadorConflito);
  });

  describe('Construtor', () => {
    it('deve lançar erro se cirurgiaRepository não for injetado', () => {
      expect(() => new AgendarCirurgiaUseCase(null, mockVerificadorConflito))
        .toThrow('As dependências cirurgiaRepository e verificadorConflito são obrigatórias.');
    });

    it('deve lançar erro se verificadorConflito não for injetado', () => {
      expect(() => new AgendarCirurgiaUseCase(mockCirurgiaRepository, null))
        .toThrow('As dependências cirurgiaRepository e verificadorConflito são obrigatórias.');
    });
  });

  const dadosCirurgiaInput = {
    pacienteId: faker.string.uuid(),
    descricao: 'Cirurgia de teste',
    data: new Date('2026-10-20T00:00:00.000Z'),
    horario: '10:00',
  };

  describe('Cenário 1: Sucesso, com data e horário (verifica conflito)', () => {
    it('deve chamar o verificador de conflito e salvar a cirurgia com o status informado', async () => {
      // Arrange
      mockVerificadorConflito.verificarConflito.mockResolvedValue(undefined); // Sem conflitos
      mockCirurgiaRepository.salvar.mockImplementation(cirurgia => Promise.resolve(cirurgia));

      // Act
      const cirurgiaSalva = await agendarCirurgiaUseCase.execute({ ...dadosCirurgiaInput, status: 'Agendado' });

      // Assert
      expect(mockVerificadorConflito.verificarConflito).toHaveBeenCalledWith(dadosCirurgiaInput.data, dadosCirurgiaInput.horario);

      // Garante que o repositório foi chamado para salvar
      expect(mockCirurgiaRepository.salvar).toHaveBeenCalledTimes(1);
      const cirurgiaPassadaParaSalvar = mockCirurgiaRepository.salvar.mock.calls[0][0];

      // Valida o estado da entidade no momento da persistência
      expect(cirurgiaPassadaParaSalvar).toBeInstanceOf(Cirurgia);
      expect(cirurgiaPassadaParaSalvar.pacienteId).toBe(dadosCirurgiaInput.pacienteId);
      expect(cirurgiaPassadaParaSalvar.status.getValue()).toBe('Agendado');
      expect(cirurgiaPassadaParaSalvar.data).toEqual(dadosCirurgiaInput.data);

      // Garante que o resultado retornado é o esperado
      expect(cirurgiaSalva).toBe(cirurgiaPassadaParaSalvar);
    });
  });

  describe('Cenário 1b: Criação sem data/horário (estágio anterior ao agendamento)', () => {
    it('deve criar e salvar a cirurgia sem consultar o verificador de conflito quando data/horário não são informados', async () => {
      mockCirurgiaRepository.salvar.mockImplementation(cirurgia => Promise.resolve(cirurgia));

      const cirurgiaSalva = await agendarCirurgiaUseCase.execute({
        pacienteId: dadosCirurgiaInput.pacienteId,
        descricao: dadosCirurgiaInput.descricao,
        status: 'Autorizado',
      });

      expect(mockVerificadorConflito.verificarConflito).not.toHaveBeenCalled();
      expect(mockCirurgiaRepository.salvar).toHaveBeenCalledTimes(1);
      expect(cirurgiaSalva.status.getValue()).toBe('Autorizado');
      expect(cirurgiaSalva.data).toBeNull();
    });

    it('deve usar o status default do domínio ("Agendamento Pendente") se nenhum status for informado', async () => {
      mockCirurgiaRepository.salvar.mockImplementation(cirurgia => Promise.resolve(cirurgia));

      const cirurgiaSalva = await agendarCirurgiaUseCase.execute({
        pacienteId: dadosCirurgiaInput.pacienteId,
      });

      expect(cirurgiaSalva.status.getValue()).toBe('Agendamento Pendente');
    });

    it('só verifica conflito quando data E horário estão presentes (não apenas um dos dois)', async () => {
      mockCirurgiaRepository.salvar.mockImplementation(cirurgia => Promise.resolve(cirurgia));

      await agendarCirurgiaUseCase.execute({ ...dadosCirurgiaInput, horario: null });
      await agendarCirurgiaUseCase.execute({ ...dadosCirurgiaInput, data: null });

      expect(mockVerificadorConflito.verificarConflito).not.toHaveBeenCalled();
    });
  });

  describe('Auditoria', () => {
    it('publica AcaoAuditavel com os dados do autor quando ele é informado', async () => {
      mockCirurgiaRepository.salvar.mockImplementation(cirurgia => Promise.resolve(cirurgia));
      const publishSpy = jest.spyOn(EventBus, 'publish');
      const autor = { id: 'usuario-1', username: 'tester' };

      const cirurgiaSalva = await agendarCirurgiaUseCase.execute(dadosCirurgiaInput, autor);

      expect(publishSpy).toHaveBeenCalledWith('AcaoAuditavel', {
        usuarioId: autor.id,
        usuarioUsername: autor.username,
        acao: 'criar',
        recurso: 'cirurgia',
        recursoId: cirurgiaSalva.id,
      });

      publishSpy.mockRestore();
    });

    it('não publica AcaoAuditavel quando nenhum autor é informado', async () => {
      mockCirurgiaRepository.salvar.mockImplementation(cirurgia => Promise.resolve(cirurgia));
      const publishSpy = jest.spyOn(EventBus, 'publish');

      await agendarCirurgiaUseCase.execute(dadosCirurgiaInput);

      expect(publishSpy).not.toHaveBeenCalledWith('AcaoAuditavel', expect.anything());

      publishSpy.mockRestore();
    });
  });

  describe('Cenário 2: Falha por Conflito', () => {
    it('deve lançar um erro e não salvar se o serviço de domínio encontrar um conflito', async () => {
      // Arrange
      const erroConflito = new Error('Conflito de agendamento! Já existe uma cirurgia neste horário.');
      mockVerificadorConflito.verificarConflito.mockRejectedValue(erroConflito);

      // Act & Assert
      await expect(agendarCirurgiaUseCase.execute(dadosCirurgiaInput)).rejects.toThrow(erroConflito);

      // Garante que o processo foi interrompido e o repositório nunca foi chamado
      expect(mockCirurgiaRepository.salvar).not.toHaveBeenCalled();
    });
  });

  describe('Cenário 3: Falha de Domínio', () => {
    it('deve propagar o erro da Entidade se dados inválidos forem passados', async () => {
      // Arrange
      const dadosInvalidos = { ...dadosCirurgiaInput, pacienteId: null };
      mockVerificadorConflito.verificarConflito.mockResolvedValue(undefined);

      // Act & Assert
      await expect(agendarCirurgiaUseCase.execute(dadosInvalidos)).rejects.toThrow('O ID do paciente (pacienteId) é obrigatório.');
      expect(mockCirurgiaRepository.salvar).not.toHaveBeenCalled();
    });
  });
});