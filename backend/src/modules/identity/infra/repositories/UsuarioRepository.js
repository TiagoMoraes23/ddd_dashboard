const UsuarioModel = require('../database/mongoose/UsuarioSchema');

class UsuarioRepository {
  constructor() {
    this.model = UsuarioModel;
  }

  /**
   * Busca um usuário pelo seu nome de usuário, incluindo a senha para verificação.
   * @param {string} username - O nome de usuário.
   * @returns {Promise<object|null>} O documento do usuário ou null.
   */
  async buscarPorUsuario(username) {
    // Busca pelo campo 'username', exatamente como está gravado no banco de dados antigo
    // O método .select('+password') é crucial porque o schema define `select: false` para a senha.
    return this.model.findOne({ username }).select('+password');
  }

  /**
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async buscarPorId(id) {
    return this.model.findById(id);
  }

  /**
   * @returns {Promise<Array<object>>} Todos os usuários, sem a senha.
   */
  async listarTodos() {
    return this.model.find().sort({ username: 1 });
  }

  /**
   * @param {{username: string, password: string, role: string}} dados
   * @returns {Promise<object>} O documento criado (a senha é hasheada pelo hook pre('save') do schema).
   */
  async criar(dados) {
    const usuario = new this.model(dados);
    return usuario.save();
  }

  /**
   * @param {string} id
   * @param {{username?: string, password?: string, role?: string}} dados
   * @returns {Promise<object|null>}
   */
  async atualizar(id, dados) {
    // .select('+password'): sem isso, atualizar só a role/username (sem tocar
    // a senha) faria o save() persistir o documento com password ausente do
    // objeto em memória — o hook pre('save') só re-hasheia se for modificada,
    // mas o campo já teria sido perdido do retorno para quem chamou.
    const usuario = await this.model.findById(id).select('+password');
    if (!usuario) return null;

    if (dados.username !== undefined) usuario.username = dados.username;
    if (dados.role !== undefined) usuario.role = dados.role;
    if (dados.password) usuario.password = dados.password; // dispara o hook pre('save') para re-hashear

    return usuario.save();
  }

  /**
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async deletar(id) {
    return this.model.findByIdAndDelete(id);
  }
}

module.exports = UsuarioRepository;