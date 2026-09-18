const StatusCirurgia = require('./StatusCirurgia');

describe('Value Object: StatusCirurgia', () => {
  describe('Cenários de Sucesso', () => {
    it('deve criar um status válido para cada valor permitido', () => {
      const valoresPermitidos = ['Autorizado', 'Agendamento Pendente', 'Agendado', 'Realizado', 'Cancelado (outro motivo)', 'Senha expirada'];

      valoresPermitidos.forEach(valor => {
        const status = new StatusCirurgia(valor);
        expect(status.getValue()).toBe(valor);
      });
    });
  });

  describe('Cenários de Falha', () => {
    it('deve lançar um erro ao tentar criar um status com um valor inválido', () => {
      const valorInvalido = 'Status Inexistente';
      expect(() => {
        new StatusCirurgia(valorInvalido);
      }).toThrow(`Status de cirurgia inválido: ${valorInvalido}`);
    });

    it('deve lançar um erro ao tentar criar um status com valor nulo ou indefinido', () => {
      expect(() => new StatusCirurgia(null)).toThrow('Status de cirurgia inválido: null');
      expect(() => new StatusCirurgia(undefined)).toThrow('Status de cirurgia inválido: undefined');
    });
  });
});