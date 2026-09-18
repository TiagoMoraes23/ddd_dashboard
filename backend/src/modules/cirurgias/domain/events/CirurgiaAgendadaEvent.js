class CirurgiaAgendadaEvent {
  static name = 'CirurgiaAgendada';

  constructor({ id, pacienteId, data, horario, status }) {
    this.occurredOn = new Date();
    this.payload = { id, pacienteId, data, horario, status };
  }
}

module.exports = CirurgiaAgendadaEvent;