class DeletarCirurgiaController {
  constructor(deletarCirurgiaUseCase) {
    this.deletarCirurgiaUseCase = deletarCirurgiaUseCase;
  }

  async handle(req, res) {
    const { id } = req.params;

    try {
      await this.deletarCirurgiaUseCase.execute(id);
      return res.status(204).send();
    } catch (error) {
      if (error.message === 'Cirurgia não encontrada.') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('obrigatório')) {
        return res.status(400).json({ message: error.message });
      }

      console.error(error);
      return res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
    }
  }
}

module.exports = DeletarCirurgiaController;
