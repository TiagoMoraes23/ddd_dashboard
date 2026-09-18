class AtualizarPacienteController {
  constructor(atualizarPacienteUseCase) {
    if (!atualizarPacienteUseCase || typeof atualizarPacienteUseCase.execute !== 'function') {
      throw new Error('A dependência atualizarPacienteUseCase (com o método execute) é obrigatória.');
    }
    this.atualizarPacienteUseCase = atualizarPacienteUseCase;
  }

  async handle(request, response) {
    try {
      const { id } = request.params;
      const dadosAtualizacao = request.body;

      const pacienteAtualizado = await this.atualizarPacienteUseCase.execute(id, dadosAtualizacao);

      return response.status(200).json(pacienteAtualizado);
    } catch (error) {
      if (error.message === 'Paciente não encontrado') {
        return response.status(404).json({ message: error.message });
      }
      return response.status(400).json({ message: error.message });
    }
  }
}

module.exports = AtualizarPacienteController;