class ListarUsuariosController {
  constructor(listarUsuariosUseCase) {
    this.listarUsuariosUseCase = listarUsuariosUseCase;
  }

  async handle(req, res) {
    try {
      const usuarios = await this.listarUsuariosUseCase.execute();
      return res.status(200).json(usuarios);
    } catch (error) {
      return res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
    }
  }
}

module.exports = ListarUsuariosController;
