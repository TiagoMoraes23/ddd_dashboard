const UsuarioModel = require('../database/mongoose/UsuarioSchema');

class UsuarioRepository {
  constructor() {
    this.model = UsuarioModel;
  }

  async buscarPorUsuario(username) {
    // O método .select('+password') é crucial porque o schema define `select: false` para a senha.
    return this.model.findOne({ username }).select('+password');
  }

  async buscarPorId(id) {
    return this.model.findById(id);
  }

  async listarTodos() {
    return this.model.find().sort({ username: 1 });
  }

  async criar(dados) {
    const usuario = new this.model(dados);
    return usuario.save();
  }

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

  async deletar(id) {
    return this.model.findByIdAndDelete(id);
  }
}

module.exports = UsuarioRepository;