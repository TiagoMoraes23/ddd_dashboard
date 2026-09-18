const Cpf = require('./valueObjects/Cpf');

class Paciente {
  /**
   * @param {Object} params
   * @param {string} params.id
   * @param {string} params.nome
   * @param {Cpf} params.cpf
   * @param {string} params.convenio
   * @param {Date} params.dataRnm
   * @param {string} params.contato
   * @param {string} params.observacoes
   * @param {string} params.linkArquivos
   * @param {string} params.fornecedor
   * @param {string} params.ultimosFornecedores 
   */
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
    this.ativo = ativo ?? true; // Garante que 'ativo' seja true por padrão, ou respeita o valor vindo do banco.
  }

  /**
   * Verifica se o exame de RNM está vencido.
   * Regra de negócio: Considera vencido se a data da RNM for superior a 12 meses da data atual.
   * @returns {boolean}
   */
  isRnmVencida() {
    if (!this.dataRnm) {
      // Se não tem RNM cadastrada, podemos considerar como "precisa fazer" (vencida/inexistente)
      return true; 
    }

    const dataValidade = new Date(this.dataRnm);
    dataValidade.setMonth(dataValidade.getMonth() + 12); // Validade de 12 meses

    const hoje = new Date();
    
    // Retira as horas para comparar apenas as datas
    hoje.setHours(0, 0, 0, 0);
    dataValidade.setHours(0, 0, 0, 0);

    return hoje > dataValidade;
  }

  /**
   * Atualiza os dados cadastrais do paciente.
   * Apenas os campos fornecidos (diferentes de undefined) serão atualizados.
   * @param {object} dados
   * @param {string} [dados.nome]
   * @param {string} [dados.convenio]
   * @param {string} [dados.observacoes]
   * @param {Date|string} [dados.dataRnm]
   * @param {string} [dados.contato]
   * @param {string} [dados.linkArquivos]
   * @param {string} [dados.fornecedor]
   * @param {string[]} [dados.ultimosFornecedores]
   * @param {string} [dados.cpf]
   */
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

  /**
   * Inativa o paciente.
   * @throws {Error} Se o paciente já estiver inativo.
   */
  inativar() {
    if (!this.ativo) {
      throw new Error('O paciente já se encontra inativo.');
    }
    this.ativo = false;
  }
}

module.exports = Paciente;