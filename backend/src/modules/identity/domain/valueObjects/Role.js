class Role {
  static #VALORES_PERMITIDOS = ['admin', 'padrao'];

  /**
   * @param {string} valor
   */
  constructor(valor) {
    if (!Role.#VALORES_PERMITIDOS.includes(valor)) {
      throw new Error(`Role inválida: ${valor}`);
    }
    this.valor = valor;
  }

  /**
   * @returns {string}
   */
  getValue() {
    return this.valor;
  }

  /**
   * @returns {boolean}
   */
  isAdmin() {
    return this.valor === 'admin';
  }
}

module.exports = Role;
