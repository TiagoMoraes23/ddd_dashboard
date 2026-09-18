class AtualizarPacienteUseCase {
  constructor(pacienteRepository) {
    if (
      !pacienteRepository ||
      typeof pacienteRepository.buscarPorId !== 'function' ||
      typeof pacienteRepository.buscarPorCpf !== 'function' ||
      typeof pacienteRepository.salvar !== 'function'
    ) {
      throw new Error('A dependência pacienteRepository (com os métodos buscarPorId, buscarPorCpf e salvar) é obrigatória.');
    }
    this.pacienteRepository = pacienteRepository;
  }

  async execute(id, dadosAtualizacao) {
    const paciente = await this.pacienteRepository.buscarPorId(id);

    if (!paciente) {
      throw new Error('Paciente não encontrado');
    }

    // Guarda o CPF anterior à mutação: é a chave usada pelo upsert
    // (a coleção não é indexada por _id de forma confiável — pacientes legados
    // guardam ObjectId nativo — então o repositório localiza o documento por CPF).
    const cpfOriginal = paciente.cpf.getValue();

    paciente.atualizarDados(dadosAtualizacao);

    if (paciente.cpf.getValue() !== cpfOriginal) {
      const conflito = await this.pacienteRepository.buscarPorCpf(paciente.cpf.getValue());
      if (conflito) {
        throw new Error('Já existe um paciente cadastrado com este CPF.');
      }
    }

    await this.pacienteRepository.salvar(paciente, cpfOriginal);

    return paciente;
  }
}

module.exports = AtualizarPacienteUseCase;