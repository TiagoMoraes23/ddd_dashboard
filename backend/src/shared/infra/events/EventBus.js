const EventEmitter = require('events');

let instance = null;

class EventBus {
  constructor() {
    if (!instance) {
      this.emitter = new EventEmitter();
      instance = this;
    }
    return instance;
  }

  publish(eventName, payload) {
    this.emitter.emit(eventName, payload);
  }

  subscribe(eventName, callback) {
    this.emitter.on(eventName, callback);
  }
}

const eventBusInstance = new EventBus();
module.exports = eventBusInstance;

// Exposta só para permitir testar a lógica de singleton da própria classe
// (chamar `new EventBus()` de novo deve retornar esta mesma instância) —
// testar isso via require() não provaria nada, já que o cache de módulos do
// Node já garante instância única independente do guard-clause do construtor.
module.exports.EventBusClass = EventBus;