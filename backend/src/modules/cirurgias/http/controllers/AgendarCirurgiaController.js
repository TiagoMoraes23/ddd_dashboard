class AgendarCirurgiaController {
  /**
   * @param {import('../../../useCases/AgendarCirurgia/AgendarCirurgiaUseCase')} agendarCirurgiaUseCase
   */
  constructor(agendarCirurgiaUseCase) {
    this.agendarCirurgiaUseCase = agendarCirurgiaUseCase;
  }

  /**
   * Lida com a requisição HTTP para agendar uma nova cirurgia.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async handle(req, res) {
    const dadosCirurgia = req.body;

    try {
      const cirurgiaAgendada = await this.agendarCirurgiaUseCase.execute(dadosCirurgia);

      return res.status(201).json(cirurgiaAgendada);
    } catch (error) {
      // Tratamento de erro específico para regras de negócio.
      if (error.message.includes('Conflito')) {
        return res.status(409).json({ message: error.message }); // 409 Conflict
      }

      // Tratamento para erros de validação de domínio ou dados faltantes.
      return res.status(400).json({ message: error.message }); // 400 Bad Request
    }
  }
}

module.exports = AgendarCirurgiaController;