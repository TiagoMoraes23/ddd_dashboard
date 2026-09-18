class ListarUsuariosUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  /**
   * @returns {Promise<Array<object>>} Lista de usuários (a senha nunca vem
   *   populada, já que o schema define `select: false` por padrão).
   */
  async execute() {
    return this.usuarioRepository.listarTodos();
  }
}

module.exports = ListarUsuariosUseCase;
