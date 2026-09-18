/**
 * Função auxiliar para converter uma string de horário "HH:MM" para o total de minutos desde a meia-noite.
 * @param {string} horario - O horário no formato "HH:MM".
 * @returns {number} O total de minutos.
 */
const horarioParaMinutos = (horario) => {
  if (!horario || !horario.includes(':')) {
    // Esta verificação é uma salvaguarda; os dados do domínio já devem ser válidos.
    throw new Error(`Formato de horário inválido: ${horario}`);
  }
  const [horas, minutos] = horario.split(':').map(Number);
  return horas * 60 + minutos;
};

class VerificadorConflitoDomainService {
  /**
   * @param {object} cirurgiaRepository - Repositório de cirurgias com o método `buscarPorDataEStatus`.
   */
  constructor(cirurgiaRepository) {
    if (!cirurgiaRepository || typeof cirurgiaRepository.buscarPorDataEStatus !== 'function') {
      throw new Error('A dependência cirurgiaRepository (com o método buscarPorDataEStatus) é obrigatória.');
    }
    this.cirurgiaRepository = cirurgiaRepository;
  }

  /**
   * Verifica se existe um conflito de horário para uma nova cirurgia.
   * @param {Date} novaData - A data da nova cirurgia.
   * @param {string} novoHorario - O horário da nova cirurgia no formato "HH:MM".
   * @param {string|null} [pacienteIdIgnorado=null] - O ID do paciente a ser ignorado na verificação (para casos de atualização da própria cirurgia).
   */
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