class DeletarCirurgiaUseCase {
  constructor(cirurgiaRepository) {
    this.cirurgiaRepository = cirurgiaRepository;
  }

  async execute(id) {
    if (!id) {
      throw new Error('ID da cirurgia é obrigatório.');
    }

    const cirurgia = await this.cirurgiaRepository.buscarPorId(id);

    if (!cirurgia) {
      throw new Error('Cirurgia não encontrada.');
    }

    await this.cirurgiaRepository.deletar(id);
  }
}

module.exports = DeletarCirurgiaUseCase;
