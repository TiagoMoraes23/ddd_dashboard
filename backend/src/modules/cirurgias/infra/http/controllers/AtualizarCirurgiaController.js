class AtualizarCirurgiaController {
  constructor(atualizarCirurgiaUseCase) {
    this.atualizarCirurgiaUseCase = atualizarCirurgiaUseCase;
  }

  async handle(req, res) {
    const { id } = req.params;
    const dadosAtualizacao = req.body;

    try {
      const cirurgiaAtualizada = await this.atualizarCirurgiaUseCase.execute(id, dadosAtualizacao);
      return res.status(200).json(cirurgiaAtualizada);
    } catch (error) {
      if (error.message === 'Cirurgia não encontrada.') {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes('Status de cirurgia inválido') || error.message.includes('obrigatório')) {
        return res.status(400).json({ message: error.message });
      }

      console.error(error);
      return res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
    }
  }
}

module.exports = AtualizarCirurgiaController;
