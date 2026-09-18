const horarioParaMinutos = (horario) => {
  if (!horario || !horario.includes(':')) {
    throw new Error(`Formato de horário inválido: ${horario}`);
  }
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
};

class VerificadorConflitoDomainService {
  constructor(cirurgiaRepository) {
    if (!cirurgiaRepository || typeof cirurgiaRepository.buscarPorDataEStatus !== 'function') {
      throw new Error('A dependência cirurgiaRepository (com o método buscarPorDataEStatus) é obrigatória.');
    }
    this.cirurgiaRepository = cirurgiaRepository;
  }

  async verificarConflito(novaData, novoHorario, pacienteIdIgnorado = null) {
    const cirurgiasAgendadas = await this.cirurgiaRepository.buscarPorDataEStatus(novaData, 'Agendado');
    const minutosNovoHorario = horarioParaMinutos(novoHorario);
    const INTERVALO_MINIMO_MINUTOS = 30;

    for (const cirurgiaExistente of cirurgiasAgendadas) {
      if (pacienteIdIgnorado && cirurgiaExistente.pacienteId === pacienteIdIgnorado) continue;

      const minutosCirurgiaExistente = horarioParaMinutos(cirurgiaExistente.horario);
      if (Math.abs(minutosNovoHorario - minutosCirurgiaExistente) < INTERVALO_MINIMO_MINUTOS) {
        throw new Error(`Conflito de agendamento! Existe uma cirurgia marcada para as ${cirurgiaExistente.horario}. O intervalo mínimo é de 30 minutos.`);
      }
    }
  }
}

module.exports = VerificadorConflitoDomainService;