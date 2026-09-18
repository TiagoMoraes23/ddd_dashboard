class CriarUsuarioController {
  constructor(criarUsuarioUseCase) {
    this.criarUsuarioUseCase = criarUsuarioUseCase;
  }

  async handle(req, res) {
    try {
      const usuario = await this.criarUsuarioUseCase.execute(req.body);
      return res.status(201).json(usuario);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
}

module.exports = CriarUsuarioController;
