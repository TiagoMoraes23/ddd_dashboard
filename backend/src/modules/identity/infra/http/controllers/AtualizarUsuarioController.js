class AtualizarUsuarioController {
  constructor(atualizarUsuarioUseCase) {
    this.atualizarUsuarioUseCase = atualizarUsuarioUseCase;
  }

  async handle(req, res) {
    try {
      const { id } = req.params;
      const usuario = await this.atualizarUsuarioUseCase.execute(id, req.body);
      return res.status(200).json(usuario);
    } catch (error) {
      if (error.message === 'Usuário não encontrado.') {
        return res.status(404).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
  }
}

module.exports = AtualizarUsuarioController;
