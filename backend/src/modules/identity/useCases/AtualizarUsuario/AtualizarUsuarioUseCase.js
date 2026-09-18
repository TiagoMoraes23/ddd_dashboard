const Role = require('../../domain/valueObjects/Role');

class AtualizarUsuarioUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute(id, { username, password, role }) {
    const usuarioExistente = await this.usuarioRepository.buscarPorId(id);
    if (!usuarioExistente) {
      throw new Error('Usuário não encontrado.');
    }

    const roleValidada = role !== undefined ? new Role(role).getValue() : undefined;

    const usuarioAtualizado = await this.usuarioRepository.atualizar(id, {
      username,
      password,
      role: roleValidada,
    });

    return {
      id: usuarioAtualizado._id.toString(),
      username: usuarioAtualizado.username,
      role: usuarioAtualizado.role,
    };
  }
}

module.exports = AtualizarUsuarioUseCase;
