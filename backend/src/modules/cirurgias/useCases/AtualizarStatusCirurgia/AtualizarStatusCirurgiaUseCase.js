class AtualizarStatusCirurgiaUseCase {
  constructor(cirurgiaRepository) {
    this.cirurgiaRepository = cirurgiaRepository;
  }

  async execute({ id, status }) {
    if (!id || !status) {
      throw new Error('ID da cirurgia e novo status são obrigatórios.');
    }

    const cirurgia = await this.cirurgiaRepository.buscarPorId(id);

    if (!cirurgia) {
      throw new Error('Cirurgia não encontrada.');
    }

    // A lógica de negócio é delegada para a entidade de domínio
    cirurgia.atualizarStatus(status);

    await this.cirurgiaRepository.salvar(cirurgia);

    return cirurgia;
  }
}

module.exports = AtualizarStatusCirurgiaUseCase;