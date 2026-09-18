class DeletarUsuarioUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

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
