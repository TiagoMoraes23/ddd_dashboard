class ListarUsuariosUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute() {
    return this.usuarioRepository.listarTodos();
  }
}

module.exports = ListarUsuariosUseCase;
