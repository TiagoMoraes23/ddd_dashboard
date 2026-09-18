class StatusCirurgia {
  // 'Cancelado (outro motivo)', não 'Cancelado' sozinho — bate com o único
  // valor real usado tanto na UI (frontend/src/constants/statusCirurgia.js)
  // quanto no dado de produção (8 cirurgias reais confirmadas ao vivo).
  static #VALORES_PERMITIDOS = ['Autorizado', 'Agendamento Pendente', 'Agendado', 'Realizado', 'Cancelado (outro motivo)', 'Senha expirada'];

  /**
   * @param {string} valor
   */
  constructor(valor) {
    if (!StatusCirurgia.#VALORES_PERMITIDOS.includes(valor)) {
      throw new Error(`Status de cirurgia inválido: ${valor}`);
    }
    this.valor = valor;
  }

  /**
   * @returns {string}
   */
  getValue() {
    return this.valor;
  }
}

module.exports = StatusCirurgia;