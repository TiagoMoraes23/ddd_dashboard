class DeletarUsuarioController {
  constructor(deletarUsuarioUseCase) {
    this.deletarUsuarioUseCase = deletarUsuarioUseCase;
  }

  async handle(req, res) {
    try {
      const { id } = req.params;
      await this.deletarUsuarioUseCase.execute(id, req.user.id);
      return res.status(200).json({ message: 'Usuário apagado com sucesso.' });
    } catch (error) {
      if (error.message === 'Usuário não encontrado.') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
  }
}

module.exports = DeletarUsuarioController;
