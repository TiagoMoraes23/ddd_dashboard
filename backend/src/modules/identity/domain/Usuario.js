const Role = require('./valueObjects/Role');

class Usuario {
  constructor({ id, username, role }) {
    if (!id) throw new Error('ID é obrigatório para instanciar um Usuario.');
    if (!username) throw new Error('Username é obrigatório.');
    if (!(role instanceof Role)) throw new Error('A role deve ser uma instância do Value Object Role.');

    this.id = id;
    this.username = username;
    this.role = role;
  }

  isAdmin() {
    return this.role.isAdmin();
  }


  paraJSON() {
    return { id: this.id, username: this.username, role: this.role.getValue() };
  }
}

module.exports = Usuario;
