class CriarPacienteController {
  constructor(criarPacienteUseCase) {
    this.criarPacienteUseCase = criarPacienteUseCase;
  }

  async handle(req, res) {
    try {
      const { nome, cpf, convenio, dataRnm, contato, observacoes, linkArquivos, fornecedor, ultimosFornecedores } = req.body;

      const paciente = await this.criarPacienteUseCase.execute({
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

      return res.status(201).json({
        id: paciente.id,
        nome: paciente.nome,
        cpf: paciente.cpf.getValue(),
        convenio: paciente.convenio,
        dataRnm: paciente.dataRnm,
        contato: paciente.contato,
        observacoes: paciente.observacoes,
        linkArquivos: paciente.linkArquivos,
        fornecedor: paciente.fornecedor,
        ultimosFornecedores: paciente.ultimosFornecedores,
        isRnmVencida: paciente.isRnmVencida(),
      });
    } catch (error) {

      return res.status(400).json({ message: error.message });
    }
  }
}

module.exports = CriarPacienteController;
