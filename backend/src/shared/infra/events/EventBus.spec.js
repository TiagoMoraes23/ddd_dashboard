const EventBus = require('./EventBus');

describe('Infra: EventBus', () => {
  // Como o EventBus é um Singleton, seus listeners persistem entre os testes.
  // É uma boa prática limpá-los para garantir o isolamento de cada `it`.
  beforeEach(() => {
    EventBus.emitter.removeAllListeners();
  });

  it('deve sempre retornar a mesma instância entre módulos (cache do require)', () => {
    // Isso prova que o Node cacheia o módulo — não prova que o guard-clause
    // do construtor (`if (!instance)`) funciona, já que require() só executa
    // o corpo do módulo (e portanto o construtor) uma vez.
    const instance1 = require('./EventBus');
    const instance2 = require('./EventBus');

    expect(instance1).toBe(instance2);
  });

  it('deve retornar a instância já existente mesmo instanciando a classe diretamente de novo (guard-clause do construtor)', () => {
    // Chama `new EventBusClass()` explicitamente uma segunda vez — diferente
    // do teste acima, isso realmente exercita o `if (!instance)` do construtor.
    const novaTentativaDeInstancia = new EventBus.EventBusClass();

    expect(novaTentativaDeInstancia).toBe(EventBus);
  });

  it('deve notificar um subscriber quando um evento é publicado com o payload correto', () => {
    // Arrange
    const eventName = 'TesteEvent';
    const payload = { id: 1, data: 'conteúdo do evento' };
    const mockSubscriber = jest.fn();

    // Act
    // 1. Inscreve o mock no evento.
    EventBus.subscribe(eventName, mockSubscriber);
    // 2. Publica o evento.
    EventBus.publish(eventName, payload);

    // Assert
    // Verifica se o mock foi chamado exatamente uma vez.
    expect(mockSubscriber).toHaveBeenCalledTimes(1);
    // Verifica se o mock foi chamado com o payload que foi publicado.
    expect(mockSubscriber).toHaveBeenCalledWith(payload);
  });

  it('não deve notificar um subscriber de um evento no qual ele não se inscreveu', () => {
    // Arrange
    const mockSubscriber = jest.fn();
    EventBus.subscribe('EventoA', mockSubscriber);

    // Act: Publica um evento diferente.
    EventBus.publish('EventoB', { id: 2 });

    // Assert: O subscriber do 'EventoA' não deve ter sido chamado.
    expect(mockSubscriber).not.toHaveBeenCalled();
  });
});