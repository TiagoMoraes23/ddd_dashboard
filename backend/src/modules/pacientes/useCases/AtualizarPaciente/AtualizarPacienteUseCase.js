class AtualizarPacienteUseCase {
  /**
   * @param {object} pacienteRepository - Repositório para persistência de pacientes.
   */
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

  /**
   * Executa o caso de uso para atualizar os dados de um paciente.
   * @param {string} id - O _id do paciente a ser atualizado.
   * @param {object} dadosAtualizacao - Os dados para atualização.
   * @returns {Promise<import('../../domain/Paciente')>} A entidade de paciente atualizada.
   */
  async execute(id, dadosAtualizacao) {
    // Passo 1: Buscar a entidade de domínio a partir da persistência.
    const paciente = await this.pacienteRepository.buscarPorId(id);

    if (!paciente) {
      throw new Error('Paciente não encontrado');
    }

    // Guarda o CPF anterior à mutação: é a chave usada pelo upsert no Passo 3
    // (a coleção não é indexada por _id de forma confiável — pacientes legados
    // guardam ObjectId nativo — então o repositório localiza o documento por CPF).
    const cpfOriginal = paciente.cpf.getValue();

    // Passo 2: Chamar o método de domínio para executar a atualização.
    // (pode trocar o CPF do paciente — checagem de unicidade no passo seguinte)
    paciente.atualizarDados(dadosAtualizacao);

    // Passo 2.5: Se o CPF mudou, garante que o novo valor não pertence a outro paciente.
    if (paciente.cpf.getValue() !== cpfOriginal) {
      const conflito = await this.pacienteRepository.buscarPorCpf(paciente.cpf.getValue());
      if (conflito) {
        throw new Error('Já existe um paciente cadastrado com este CPF.');
      }
    }

    // Passo 3: Persistir a entidade atualizada, localizando o documento pelo CPF
    // original — necessário para não criar um duplicado quando o CPF mudou.
    await this.pacienteRepository.salvar(paciente, cpfOriginal);

    return paciente;
  }
}

module.exports = AtualizarPacienteUseCase;