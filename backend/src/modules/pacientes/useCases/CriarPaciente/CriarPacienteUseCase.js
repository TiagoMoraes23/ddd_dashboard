const crypto = require('crypto');
const Paciente = require('../../domain/Paciente');
const Cpf = require('../../domain/valueObjects/Cpf');

class CriarPacienteUseCase {
  /**
   * O Repositório é injetado no construtor (Inversão de Dependência)
   */
  constructor(pacienteRepository) {
    this.pacienteRepository = pacienteRepository;
  }

  async execute(data) {
    const {
      nome,
      cpf: cpfString,
      convenio,
      dataRnm,
      contato,
      observacoes,
      linkArquivos,
      fornecedor,
      ultimosFornecedores,
    } = data;

    // 1. Instancia o Value Object do CPF (Isso validará o formato e matemática automaticamente)
    const cpf = new Cpf(cpfString);

    // 2. Verifica regras de unicidade no banco via repositório
    const pacienteExistente = await this.pacienteRepository.buscarPorCpf(cpf.getValue());
    if (pacienteExistente) {
      throw new Error('Já existe um paciente cadastrado com este CPF.');
    }

    // 3. Cria a Entidade de Domínio Rica
    const paciente = new Paciente({
      id: crypto.randomUUID(),
      nome,
      cpf,
      convenio,
      dataRnm,
      contato,
      observacoes,
      linkArquivos,
      fornecedor,
      ultimosFornecedores,
    });

    // 4. Delega a persistência ao repositório
    await this.pacienteRepository.salvar(paciente);

    return paciente;
  }
}

module.exports = CriarPacienteUseCase;