const Role = require('./valueObjects/Role');

class Usuario {
  /**
   * @param {Object} params
   * @param {string} params.id
   * @param {string} params.username
   * @param {Role} params.role
   */
  constructor({ id, username, role }) {
    if (!id) throw new Error('ID é obrigatório para instanciar um Usuario.');
    if (!username) throw new Error('Username é obrigatório.');
    if (!(role instanceof Role)) throw new Error('A role deve ser uma instância do Value Object Role.');

    this.id = id;
    this.username = username;
    this.role = role;
  }

  /**
   * @returns {boolean}
   */
  isAdmin() {
    return this.role.isAdmin();
  }

  /**
   * Representação segura para resposta HTTP/payload de JWT — nunca inclui a senha,
   * que sequer é modelada nesta entidade (fica a cargo do repositório/use case).
   * @returns {{id: string, username: string, role: string}}
   */
  paraJSON() {
    return { id: this.id, username: this.username, role: this.role.getValue() };
  }
}

module.exports = Usuario;
