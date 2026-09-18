class AgendarCirurgiaController {
  constructor(agendarCirurgiaUseCase) {
    this.agendarCirurgiaUseCase = agendarCirurgiaUseCase;
  }

  async handle(req, res) {
    const { pacienteId, descricao, status, data, horario, opme, fornecedor, hospital, regiao, observacoes } = req.body;

    try {
      const cirurgiaAgendada = await this.agendarCirurgiaUseCase.execute(
        {
          pacienteId,
          descricao,
          status,
          data,
          horario,
          opme,
          fornecedor,
          hospital,
          regiao,
          observacoes,
        },
        req.user
      );

      return res.status(201).json(cirurgiaAgendada);
    } catch (error) {
      if (error.message.includes('Conflito de agendamento')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes('obrigatórios')) {
        return res.status(400).json({ error: error.message });
      }

      console.error(error);
      return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
  }
}

module.exports = AgendarCirurgiaController;