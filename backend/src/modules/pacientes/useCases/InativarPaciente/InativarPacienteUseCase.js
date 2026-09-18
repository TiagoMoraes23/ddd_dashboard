class InativarPacienteUseCase {
  constructor(pacienteRepository) {
    if (!pacienteRepository || typeof pacienteRepository.buscarPorId !== 'function' || typeof pacienteRepository.salvar !== 'function') {
      throw new Error('A dependência pacienteRepository (com os métodos buscarPorId e salvar) é obrigatória.');
    }
    this.pacienteRepository = pacienteRepository;
  }

  async execute(id) {
    const paciente = await this.pacienteRepository.buscarPorId(id);

    if (!paciente) {
      throw new Error('Paciente não encontrado');
    }

    paciente.inativar();

    await this.pacienteRepository.salvar(paciente);

    return 'Paciente inativado com sucesso';
  }
}

module.exports = InativarPacienteUseCase;