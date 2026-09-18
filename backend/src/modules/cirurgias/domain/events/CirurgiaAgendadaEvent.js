/**
 * Representa o evento de domínio que ocorre quando uma cirurgia é agendada com sucesso.
 * Este objeto carrega os dados relevantes do evento.
 */
class CirurgiaAgendadaEvent {
  static name = 'CirurgiaAgendada';

  /**
   * @param {object} cirurgiaData
   * @param {string} cirurgiaData.id
   * @param {string} cirurgiaData.pacienteId
   * @param {Date} cirurgiaData.data
   * @param {string} cirurgiaData.horario
   * @param {string} cirurgiaData.status
   */
  constructor({ id, pacienteId, data, horario, status }) {
    this.occurredOn = new Date();
    this.payload = { id, pacienteId, data, horario, status };
  }
}

module.exports = CirurgiaAgendadaEvent;