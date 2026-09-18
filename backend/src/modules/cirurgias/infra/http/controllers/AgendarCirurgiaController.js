class AgendarCirurgiaController {
  constructor(agendarCirurgiaUseCase) {
    this.agendarCirurgiaUseCase = agendarCirurgiaUseCase;
  }

  async handle(req, res) {
    // Extrai todos os dados necessários do corpo da requisição.
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

      // Retorna 201 Created, que é o status HTTP semanticamente correto para a criação de um novo recurso.
      return res.status(201).json(cirurgiaAgendada);
    } catch (error) {
      if (error.message.includes('Conflito de agendamento')) {
        return res.status(409).json({ error: error.message }); // 409 Conflict
      }
      if (error.message.includes('obrigatórios')) {
        return res.status(400).json({ error: error.message }); // 400 Bad Request
      }

      console.error(error);
      return res.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
    }
  }
}

module.exports = AgendarCirurgiaController;