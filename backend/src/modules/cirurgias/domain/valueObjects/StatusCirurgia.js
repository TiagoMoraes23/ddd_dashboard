class StatusCirurgia {
 
  static #VALORES_PERMITIDOS = ['Autorizado', 'Agendamento Pendente', 'Agendado', 'Realizado', 'Cancelado (outro motivo)', 'Senha expirada'];

  constructor(valor) {
    if (!StatusCirurgia.#VALORES_PERMITIDOS.includes(valor)) {
      throw new Error(`Status de cirurgia inválido: ${valor}`);
    }
    this.valor = valor;
  }

  getValue() {
    return this.valor;
  }
}

module.exports = StatusCirurgia;