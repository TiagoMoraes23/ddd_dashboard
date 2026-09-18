class DeletarUsuarioUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  /**
   * @param {string} id - Usuário a ser removido.
   * @param {string} idUsuarioLogado - Quem está fazendo a requisição, para impedir auto-exclusão.
   */
  async execute(id, idUsuarioLogado) {
    if (id === idUsuarioLogado) {
      throw new Error('Você não pode apagar o seu próprio usuário.');
    }

    const usuarioExistente = await this.usuarioRepository.buscarPorId(id);
    if (!usuarioExistente) {
      throw new Error('Usuário não encontrado.');
    }

    await this.usuarioRepository.deletar(id);
  }
}

module.exports = DeletarUsuarioUseCase;
