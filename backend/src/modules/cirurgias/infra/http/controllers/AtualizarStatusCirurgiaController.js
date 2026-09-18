class AtualizarStatusCirurgiaController {
  constructor(atualizarStatusCirurgiaUseCase) {
    this.atualizarStatusCirurgiaUseCase = atualizarStatusCirurgiaUseCase;
  }

  async handle(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const cirurgiaAtualizada = await this.atualizarStatusCirurgiaUseCase.execute({ id, status });
      return res.status(200).json(cirurgiaAtualizada);
    } catch (error) {
      if (error.message === 'Cirurgia não encontrada.') {
        return res.status(404).json({ error: error.message });
      }

      // 'inválido' cobre a mensagem real lançada pelo VO StatusCirurgia
      // ("Status de cirurgia inválido: X").
      if (error.message.includes('inválido') || error.message.includes('Não é possível alterar') || error.message.includes('Não é possível realizar')) {
        return res.status(400).json({ error: error.message });
      }

      console.error(error);
      return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
  }
}

module.exports = AtualizarStatusCirurgiaController;