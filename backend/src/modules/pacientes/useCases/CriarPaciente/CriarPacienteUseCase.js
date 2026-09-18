const crypto = require('crypto');
const Paciente = require('../../domain/Paciente');
const Cpf = require('../../domain/valueObjects/Cpf');

class CriarPacienteUseCase {
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

    const cpf = new Cpf(cpfString);

    const pacienteExistente = await this.pacienteRepository.buscarPorCpf(cpf.getValue());
    if (pacienteExistente) {
      throw new Error('Já existe um paciente cadastrado com este CPF.');
    }

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

    await this.pacienteRepository.salvar(paciente);

    return paciente;
  }
}

module.exports = CriarPacienteUseCase;