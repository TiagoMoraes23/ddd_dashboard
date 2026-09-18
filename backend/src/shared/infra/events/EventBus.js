const EventEmitter = require('events');

let instance = null;

/**
 * Implementação do Event Bus usando o padrão Singleton para garantir uma única
 * instância do EventEmitter em toda a aplicação.
 * Este é o coração da nossa arquitetura orientada a eventos, permitindo a
 * comunicação desacoplada entre diferentes módulos.
 */
class EventBus {
  constructor() {
    if (!instance) {
      this.emitter = new EventEmitter();
      instance = this;
    }
    return instance;
  }

  /**
   * Publica um evento no barramento.
   * @param {string} eventName - O nome do evento.
   * @param {object} payload - Os dados a serem enviados com o evento.
   */
  publish(eventName, payload) {
    this.emitter.emit(eventName, payload);
  }

  /**
   * Inscreve um ouvinte para um determinado evento.
   * @param {string} eventName - O nome do evento.
   * @param {function} callback - A função a ser executada quando o evento for publicado.
   */
  subscribe(eventName, callback) {
    this.emitter.on(eventName, callback);
  }
}

// Exporta a instância única do EventBus, pronta para ser usada em qualquer lugar.
const eventBusInstance = new EventBus();
module.exports = eventBusInstance;

// Exposta só para permitir testar a lógica de singleton da própria classe
// (chamar `new EventBus()` de novo deve retornar esta mesma instância) —
// testar isso via require() não provaria nada, já que o cache de módulos do
// Node já garante instância única independente do guard-clause do construtor.
module.exports.EventBusClass = EventBus;