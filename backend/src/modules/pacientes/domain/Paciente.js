const Cpf = require('./valueObjects/Cpf');

class Paciente {
  constructor({ id, nome, cpf, convenio, dataRnm, contato, observacoes, linkArquivos, fornecedor, ultimosFornecedores, ativo }) {
    if (!id) throw new Error('ID é obrigatório para instanciar um Paciente.');
    if (!nome) throw new Error('Nome é obrigatório.');
    if (!(cpf instanceof Cpf)) throw new Error('O CPF deve ser uma instância do Value Object Cpf.');

    this.id = id;
    this.nome = nome;
    this.cpf = cpf;
    this.convenio = convenio || null;
    this.dataRnm = dataRnm ? new Date(dataRnm) : null;
    this.contato = contato;
    this.observacoes = observacoes;
    this.linkArquivos = linkArquivos;
    this.fornecedor = fornecedor;
    this.ultimosFornecedores = ultimosFornecedores || [];
    this.ativo = ativo ?? true;
  }

  isRnmVencida() {
    if (!this.dataRnm) {
      // Se não tem RNM cadastrada, podemos considerar como "precisa fazer" (vencida/inexistente)
      return true; 
    }

    const dataValidade = new Date(this.dataRnm);
    dataValidade.setMonth(dataValidade.getMonth() + 12);

    const hoje = new Date();
    
    hoje.setHours(0, 0, 0, 0);
    dataValidade.setHours(0, 0, 0, 0);

    return hoje > dataValidade;
  }

  atualizarDados({ nome, convenio, observacoes, dataRnm, contato, linkArquivos, fornecedor, ultimosFornecedores, cpf }) {
    if (cpf !== undefined) this.cpf = new Cpf(cpf);
    if (nome !== undefined) this.nome = nome;
    if (convenio !== undefined) this.convenio = convenio;
    if (observacoes !== undefined) this.observacoes = observacoes;
    if (dataRnm !== undefined) this.dataRnm = dataRnm ? new Date(dataRnm) : null;
    if (contato !== undefined) this.contato = contato;
    if (linkArquivos !== undefined) this.linkArquivos = linkArquivos;
    if (fornecedor !== undefined) this.fornecedor = fornecedor;
    if (ultimosFornecedores !== undefined) this.ultimosFornecedores = ultimosFornecedores;
  }

  inativar() {
    if (!this.ativo) {
      throw new Error('O paciente já se encontra inativo.');
    }
    this.ativo = false;
  }
}

module.exports = Paciente;