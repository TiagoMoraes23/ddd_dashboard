class Role {
  static #VALORES_PERMITIDOS = ['admin', 'padrao'];

  constructor(valor) {
    if (!Role.#VALORES_PERMITIDOS.includes(valor)) {
      throw new Error(`Role inválida: ${valor}`);
    }
    this.valor = valor;
  }

  getValue() {
    return this.valor;
  }

  isAdmin() {
    return this.valor === 'admin';
  }
}

module.exports = Role;
