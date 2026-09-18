const EventBus = require('./EventBus');
const AuditoriaModel = require('../database/mongoose/AuditoriaSchema');

/**
 * Ouve o evento genérico 'AcaoAuditavel' e persiste um registro na coleção
 * `auditoria`. Qualquer caso de uso de escrita pode publicar esse evento
 * (usuarioId/usuarioUsername/acao/recurso/recursoId) para ser auditado —
 * hoje só AgendarCirurgiaUseCase o faz.
 */
class AuditoriaSubscriber {
  static setup() {
    EventBus.subscribe('AcaoAuditavel', async (payload) => {
      try {
        await AuditoriaModel.create(payload);
      } catch (error) {
        // A ação principal já foi concluída com sucesso quando este evento é
        // publicado — uma falha ao gravar o registro de auditoria não pode
        // derrubar esse resultado, só é registrada.
        console.error(error);
      }
    });
  }
}

module.exports = AuditoriaSubscriber;
