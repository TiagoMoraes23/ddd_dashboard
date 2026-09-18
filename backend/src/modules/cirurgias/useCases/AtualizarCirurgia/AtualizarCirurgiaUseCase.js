class AtualizarCirurgiaUseCase {
  constructor(cirurgiaRepository) {
    this.cirurgiaRepository = cirurgiaRepository;
  }

  /**
   * Atualiza os campos editáveis de uma cirurgia existente.
   * @param {string} id
   * @param {object} dadosAtualizacao
   */
  async execute(id, dadosAtualizacao) {
    if (!id) {
      throw new Error('ID da cirurgia é obrigatório.');
    }

    const cirurgia = await this.cirurgiaRepository.buscarPorId(id);

    if (!cirurgia) {
      throw new Error('Cirurgia não encontrada.');
    }

    cirurgia.atualizarDados(dadosAtualizacao);

    return this.cirurgiaRepository.salvar(cirurgia);
  }
}

module.exports = AtualizarCirurgiaUseCase;
