const Role = require('./Role');

describe('Value Object: Role', () => {
  describe('Cenários de Sucesso', () => {
    it('deve criar uma role válida para cada valor permitido', () => {
      const valoresPermitidos = ['admin', 'padrao'];

      valoresPermitidos.forEach(valor => {
        const role = new Role(valor);
        expect(role.getValue()).toBe(valor);
      });
    });

    it('isAdmin() deve retornar true apenas para "admin"', () => {
      expect(new Role('admin').isAdmin()).toBe(true);
      expect(new Role('padrao').isAdmin()).toBe(false);
    });
  });

  describe('Cenários de Falha', () => {
    it('deve lançar um erro ao tentar criar uma role com um valor inválido', () => {
      const valorInvalido = 'superadmin';
      expect(() => {
        new Role(valorInvalido);
      }).toThrow(`Role inválida: ${valorInvalido}`);
    });

    it('deve lançar um erro ao tentar criar uma role com valor nulo ou indefinido', () => {
      expect(() => new Role(null)).toThrow('Role inválida: null');
      expect(() => new Role(undefined)).toThrow('Role inválida: undefined');
    });
  });
});
