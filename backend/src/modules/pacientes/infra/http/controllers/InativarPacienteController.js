class InativarPacienteController {
  constructor(inativarPacienteUseCase) {
    this.inativarPacienteUseCase = inativarPacienteUseCase;
  }

  async handle(req, res) {
    const { id } = req.params;

    try {
      const resultado = await this.inativarPacienteUseCase.execute(id);
      return res.status(200).json({ message: resultado });
    } catch (error) {
      if (error.message === 'O paciente já se encontra inativo.') {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === 'Paciente não encontrado') {
        return res.status(404).json({ message: error.message });
      }

      console.error(error);
      return res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
    }
  }
}

module.exports = InativarPacienteController;