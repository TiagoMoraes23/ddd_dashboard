const StatusCirurgia = require('./valueObjects/StatusCirurgia');

class Cirurgia {
  /**
   * @param {Object} params
   * @param {string} params.id
   * @param {string} params.pacienteId
   * @param {string} [params.descricao]
   * @param {string} [params.status='Agendamento Pendente']
   * @param {Date} [params.data]
   * @param {string} [params.horario]
   * @param {string} [params.opme]
   * @param {string} [params.fornecedor]
   * @param {string} [params.hospital]
   * @param {string[]} [params.regiao] - Uma cirurgia pode tratar mais de uma articulação.
   * @param {string} [params.observacoes]
   */
  constructor({ id, pacienteId, descricao, status = 'Agendamento Pendente', data, horario, opme, fornecedor, hospital, regiao, observacoes }) {
    if (!id) throw new Error('ID é obrigatório para instanciar uma Cirurgia.');
    if (!pacienteId) throw new Error('O ID do paciente (pacienteId) é obrigatório.');

    this.id = id;
    this.pacienteId = pacienteId;
    this.descricao = descricao || null;
    this.status = new StatusCirurgia(status);
    this.data = data ? new Date(data) : null;
    this.horario = horario || null;
    this.opme = opme || null;
    this.fornecedor = fornecedor || null;
    this.hospital = hospital || null;
    this.regiao = regiao || [];
    this.observacoes = observacoes || null;
  }

  /**
   * Agenda a cirurgia, atualizando data, horário e status.
   * @param {Date} data
   * @param {string} horario
   */
  agendar(data, horario) {
    if (!data || !horario) {
      throw new Error('Data e horário são obrigatórios para agendar a cirurgia.');
    }

    this.data = new Date(data);
    this.horario = horario;
    this.status = new StatusCirurgia('Agendado');
  }

  /**
   * Atualiza o status da cirurgia, garantindo a validação através do Value Object.
   * @param {string} novoStatus - O novo status para a cirurgia (ex: 'Realizado', 'Cancelado').
   */
  atualizarStatus(novoStatus) {
    this.status = new StatusCirurgia(novoStatus);
  }

  /**
   * Atualiza os dados editáveis da cirurgia (id e pacienteId não mudam de dono).
   * Só altera os campos explicitamente informados.
   */
  atualizarDados({ descricao, status, data, horario, opme, fornecedor, hospital, regiao, observacoes }) {
    if (descricao !== undefined) this.descricao = descricao;
    if (status !== undefined) this.status = new StatusCirurgia(status);
    if (data !== undefined) this.data = data ? new Date(data) : null;
    if (horario !== undefined) this.horario = horario;
    if (opme !== undefined) this.opme = opme;
    if (fornecedor !== undefined) this.fornecedor = fornecedor;
    if (hospital !== undefined) this.hospital = hospital;
    if (regiao !== undefined) this.regiao = regiao;
    if (observacoes !== undefined) this.observacoes = observacoes;
  }
}

module.exports = Cirurgia;