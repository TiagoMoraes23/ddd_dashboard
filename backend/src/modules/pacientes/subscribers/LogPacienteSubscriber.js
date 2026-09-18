const EventBus = require('../../../shared/infra/events/EventBus');

class LogPacienteSubscriber {
  static setup() {
    EventBus.subscribe('CirurgiaAgendada', (payload) => {
      console.log(
        `[Event Bus - Módulo Pacientes] Uma nova cirurgia foi agendada para o paciente ${
          payload.pacienteId
        } na data ${new Date(payload.data).toLocaleDateString(
          'pt-BR'
        )}. Preparando rotinas de acompanhamento...`
      );
    });
  }
}

module.exports = LogPacienteSubscriber;