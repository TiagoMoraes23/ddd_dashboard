const criarIntervaloDeData = require('./criarIntervaloDeData');

describe('Util: criarIntervaloDeData', () => {
  it('deve retornar [null, null] para texto vazio', () => {
    expect(criarIntervaloDeData('')).toEqual([null, null]);
    expect(criarIntervaloDeData(undefined)).toEqual([null, null]);
  });

  it('deve interpretar mes/ano (mm/aaaa)', () => {
    const [inicio, fim] = criarIntervaloDeData('02/2024');
    expect(inicio.toISOString()).toBe('2024-02-01T00:00:00.000Z');
    expect(fim.toISOString()).toBe('2024-02-29T23:59:59.999Z'); // 2024 é bissexto
  });

  it('deve interpretar dia/mes/ano (dd/mm/aaaa)', () => {
    const [inicio, fim] = criarIntervaloDeData('15/03/2024');
    expect(inicio.toISOString()).toBe('2024-03-15T00:00:00.000Z');
    expect(fim.toISOString()).toBe('2024-03-15T23:59:59.999Z');
  });

  it('deve interpretar apenas o ano (aaaa)', () => {
    const [inicio, fim] = criarIntervaloDeData('2023');
    expect(inicio.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    expect(fim.toISOString()).toBe('2023-12-31T23:59:59.999Z');
  });

  it('deve retornar [null, null] para mes invalido', () => {
    expect(criarIntervaloDeData('13/2024')).toEqual([null, null]);
  });

  it('deve retornar [null, null] para dia invalido no formato dd/mm/aaaa', () => {
    expect(criarIntervaloDeData('32/01/2024')).toEqual([null, null]);
    expect(criarIntervaloDeData('00/01/2024')).toEqual([null, null]);
  });

  it('deve retornar [null, null] para formato nao reconhecido', () => {
    expect(criarIntervaloDeData('abacate')).toEqual([null, null]);
  });
});
