const VerificadorConflitoDomainService = require('./VerificadorConflitoDomainService');

// Mock do repositório de cirurgias para os testes
const mockCirurgiaRepository = {
  buscarPorDataEStatus: jest.fn(),
};

describe('Domain Service: VerificadorConflitoDomainService', () => {
  let verificadorConflitoService;
  const dataTeste = new Date('2026-07-25T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    verificadorConflitoService = new VerificadorConflitoDomainService(mockCirurgiaRepository);
  });

  it('deve lançar um erro se o repositório não for injetado corretamente', () => {
    expect(() => new VerificadorConflitoDomainService(null)).toThrow('A dependência cirurgiaRepository (com o método buscarPorDataEStatus) é obrigatória.');
    expect(() => new VerificadorConflitoDomainService({})).toThrow('A dependência cirurgiaRepository (com o método buscarPorDataEStatus) é obrigatória.');
  });

  describe('Cenário 1: Sucesso (sem cirurgias no dia)', () => {
    it('não deve lançar erro se não houver cirurgias agendadas para a data', async () => {
      mockCirurgiaRepository.buscarPorDataEStatus.mockResolvedValue([]);

      await expect(
        verificadorConflitoService.verificarConflito(dataTeste, '10:00')
      ).resolves.not.toThrow();

      expect(mockCirurgiaRepository.buscarPorDataEStatus).toHaveBeenCalledWith(dataTeste, 'Agendado');
    });
  });

  describe('Cenário 2: Sucesso (intervalo suficiente)', () => {
    it('não deve lançar erro se o intervalo entre cirurgias for de 30 minutos ou mais', async () => {
      const cirurgiasAgendadas = [{ pacienteId: 'paciente-1', horario: '14:00' }];
      mockCirurgiaRepository.buscarPorDataEStatus.mockResolvedValue(cirurgiasAgendadas);

      // Testa com 1h de diferença
      await expect(verificadorConflitoService.verificarConflito(dataTeste, '15:00')).resolves.not.toThrow();
      // Testa com exatamente 30min de diferença
      await expect(verificadorConflitoService.verificarConflito(dataTeste, '14:30')).resolves.not.toThrow();
    });
  });

  describe('Cenário 3: Falha (conflito de horário)', () => {
    it('deve lançar um erro se o intervalo for menor que 30 minutos', async () => {
      const horarioExistente = '14:00';
      const cirurgiasAgendadas = [{ pacienteId: 'paciente-1', horario: horarioExistente }];
      mockCirurgiaRepository.buscarPorDataEStatus.mockResolvedValue(cirurgiasAgendadas);

      const novoHorarioConflitante = '14:15';

      await expect(
        verificadorConflitoService.verificarConflito(dataTeste, novoHorarioConflitante)
      ).rejects.toThrow(`Conflito de agendamento! Existe uma cirurgia marcada para as ${horarioExistente}. O intervalo mínimo é de 30 minutos.`);
    });
  });

  describe('Salvaguarda: horário malformado', () => {
    it('deve lançar erro se o novo horário não estiver no formato HH:MM', async () => {
      mockCirurgiaRepository.buscarPorDataEStatus.mockResolvedValue([]);

      await expect(
        verificadorConflitoService.verificarConflito(dataTeste, '1000')
      ).rejects.toThrow('Formato de horário inválido: 1000');
    });
  });

  describe('Cenário 4: Sucesso (conflito ignorado para o mesmo paciente)', () => {
    it('não deve lançar erro se o conflito for com uma cirurgia do próprio paciente (caso de atualização)', async () => {
      const pacienteIdParaIgnorar = 'paciente-xyz-987';
      const cirurgiasAgendadas = [{ pacienteId: pacienteIdParaIgnorar, horario: '14:00' }];
      mockCirurgiaRepository.buscarPorDataEStatus.mockResolvedValue(cirurgiasAgendadas);

      // Ao passar o ID do paciente, o conflito com a sua própria cirurgia deve ser ignorado.
      await expect(
        verificadorConflitoService.verificarConflito(dataTeste, '14:15', pacienteIdParaIgnorar)
      ).resolves.not.toThrow();
    });
  });
});