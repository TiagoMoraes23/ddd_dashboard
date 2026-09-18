const Role = require('../../domain/valueObjects/Role');

class CriarUsuarioUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute({ username, password, role }) {
    if (!username || !password) {
      throw new Error('Usuário e senha são obrigatórios.');
    }

    // Valida a role antes de qualquer acesso ao banco (mesmo padrão do Cpf em CriarPacienteUseCase).
    const roleValidada = new Role(role || 'padrao');

    const usuarioExistente = await this.usuarioRepository.buscarPorUsuario(username);
    if (usuarioExistente) {
      throw new Error('Já existe um usuário cadastrado com este nome de usuário.');
    }

    const usuarioCriado = await this.usuarioRepository.criar({
      username,
      password,
      role: roleValidada.getValue(),
    });

    return { id: usuarioCriado._id.toString(), username: usuarioCriado.username, role: usuarioCriado.role };
  }
}

module.exports = CriarUsuarioUseCase;
