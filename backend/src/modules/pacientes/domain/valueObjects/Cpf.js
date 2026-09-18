class Cpf {
  constructor(value, { skipValidation = false } = {}) {
    if (value === null || value === undefined || value === '') {
      throw new Error('O CPF não pode ser vazio.');
    }

    const cleanValue = String(value).replace(/\D/g, '');

    if (!skipValidation && !this._isValid(cleanValue)) {
      throw new Error('CPF inválido fornecido.');
    }

    this._value = cleanValue;

    Object.freeze(this);
  }

  /**
   * Reconstrói um CPF vindo da persistência sem revalidar o formato.
   * Existem registros legados com CPF inválido (salvos antes dessa validação
   * existir) — sem isso, carregar esses registros pra corrigi-los pela edição
   * lançaria erro antes mesmo de abrir o formulário.
   * Nunca usar para CPF vindo de input do usuário (criação/edição usam `new Cpf()`).
   */
  static reconstituir(value) {
    return new Cpf(value, { skipValidation: true });
  }

  getValue() {
    return this._value;
  }

  getFormatted() {
    return this._value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  _isValid(cpf) {
    if (cpf.length !== 11) return false;

    // Rejeita sequências conhecidas que passam na fórmula matemática
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    let remainder;

    // Validação do primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    // Validação do segundo dígito verificador
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  }
}

module.exports = Cpf;
