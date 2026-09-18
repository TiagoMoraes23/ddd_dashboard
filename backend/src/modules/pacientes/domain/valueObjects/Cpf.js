class Cpf {
  /**
   * @param {string} value
   * @param {object} [opts]
   * @param {boolean} [opts.skipValidation] - Uso interno (ver `Cpf.reconstituir`).
   */
  constructor(value, { skipValidation = false } = {}) {
    if (value === null || value === undefined || value === '') {
      throw new Error('O CPF não pode ser vazio.');
    }

    // Remove tudo que não for dígito
    const cleanValue = String(value).replace(/\D/g, '');

    if (!skipValidation && !this._isValid(cleanValue)) {
      throw new Error('CPF inválido fornecido.');
    }

    this._value = cleanValue;

    // Congela o objeto para garantir a imutabilidade
    Object.freeze(this);
  }

  /**
   * Reconstrói um CPF vindo da persistência sem revalidar o formato.
   * Existem registros legados com CPF inválido (salvos antes dessa validação
   * existir) — sem isso, carregar esses registros pra corrigi-los pela edição
   * lançaria erro antes mesmo de abrir o formulário.
   * Nunca usar para CPF vindo de input do usuário (criação/edição usam `new Cpf()`).
   * @param {string} value
   * @returns {Cpf}
   */
  static reconstituir(value) {
    return new Cpf(value, { skipValidation: true });
  }

  /**
   * Retorna apenas os números do CPF
   * @returns {string}
   */
  getValue() {
    return this._value;
  }

  /**
   * Retorna o CPF formatado (XXX.XXX.XXX-XX)
   * @returns {string}
   */
  getFormatted() {
    return this._value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Validação matemática do CPF Brasileiro
   * @param {string} cpf
   * @returns {boolean}
   * @private
   */
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
