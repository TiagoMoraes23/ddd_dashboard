const EventBus = require('../../../shared/infra/events/EventBus');

/**
 * Este Subscriber pertence ao Módulo de Pacientes e "ouve" eventos de outros
 * módulos para reagir a eles, sem criar um acoplamento direto.
 */
class LogPacienteSubscriber {
  /**
   * Configura as inscrições de eventos para este subscriber.
   * Deve ser chamado na inicialização da aplicação para que o ouvinte comece a funcionar.
   */
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