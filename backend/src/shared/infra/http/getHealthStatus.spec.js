const getHealthStatus = require('./getHealthStatus');

describe('Util: getHealthStatus', () => {
  it('deve retornar 200/ok quando o Mongo estiver conectado (readyState 1)', () => {
    expect(getHealthStatus(1)).toEqual({
      httpStatus: 200,
      body: { status: 'ok', db: 'conectado' },
    });
  });

  it('deve retornar 503/degraded quando o Mongo estiver desconectado (readyState 0)', () => {
    expect(getHealthStatus(0)).toEqual({
      httpStatus: 503,
      body: { status: 'degraded', db: 'desconectado' },
    });
  });

  it('deve retornar 503/degraded para os estados intermediários (conectando/desconectando)', () => {
    expect(getHealthStatus(2).body.db).toBe('conectando');
    expect(getHealthStatus(3).body.db).toBe('desconectando');
    expect(getHealthStatus(2).httpStatus).toBe(503);
    expect(getHealthStatus(3).httpStatus).toBe(503);
  });

  it('deve retornar "desconhecido" para um readyState não mapeado', () => {
    expect(getHealthStatus(99).body.db).toBe('desconhecido');
    expect(getHealthStatus(99).httpStatus).toBe(503);
  });
});
