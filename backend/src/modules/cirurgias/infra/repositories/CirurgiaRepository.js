const CirurgiaModel = require('../database/mongoose/CirurgiaSchema');
const Cirurgia = require('../../domain/Cirurgia');

class CirurgiaRepository {
  constructor(model = CirurgiaModel) {
    this.model = model;
  }

  /**
   * Salva (cria ou atualiza) uma entidade de Cirurgia na base de dados.
   * @param {import('../../domain/Cirurgia')} cirurgia - A entidade de domínio Cirurgia.
   * @returns {Promise<object>} O documento salvo.
   */
  async salvar(cirurgia) {
    const dadosPersistencia = {
      _id: cirurgia.id,
      pacienteId: cirurgia.pacienteId,
      descricao: cirurgia.descricao,
      status: cirurgia.status.getValue(), // Extrai o valor do Value Object
      data: cirurgia.data,
      horario: cirurgia.horario,
      opme: cirurgia.opme,
      fornecedor: cirurgia.fornecedor,
      hospital: cirurgia.hospital,
      regiao: cirurgia.regiao,
      observacoes: cirurgia.observacoes,
    };

    // Usa findOneAndUpdate com upsert: true para criar ou atualizar o documento.
    const cirurgiaSalva = await this.model.findOneAndUpdate(
      { _id: cirurgia.id },
      dadosPersistencia,
      { new: true, upsert: true }
    );

    return cirurgiaSalva;
  }

  /**
   * Busca uma cirurgia pelo ID e a reconstrói como entidade de domínio.
   * @param {string} id
   * @returns {Promise<Cirurgia|null>}
   */
  async buscarPorId(id) {
    const doc = await this.model.findById(id);
    if (!doc) return null;

    return new Cirurgia({
      id: doc._id,
      pacienteId: doc.pacienteId,
      descricao: doc.descricao,
      status: doc.status,
      data: doc.data,
      horario: doc.horario,
      opme: doc.opme,
      fornecedor: doc.fornecedor,
      hospital: doc.hospital,
      regiao: doc.regiao,
      observacoes: doc.observacoes,
    });
  }

  /**
   * Apaga uma cirurgia pelo ID.
   * @param {string} id
   */
  async deletar(id) {
    await this.model.deleteOne({ _id: id });
  }

  /**
   * Busca todas as cirurgias agendadas para uma data específica.
   * @param {Date} data - A data para a busca.
   * @param {string} status - O status a ser filtrado (ex: 'Agendado').
   * @returns {Promise<Array<object>>} Um array de cirurgias.
   */
  async buscarPorDataEStatus(data, status) {
    const inicioDoDia = new Date(data);
    inicioDoDia.setUTCHours(0, 0, 0, 0);

    const fimDoDia = new Date(data);
    fimDoDia.setUTCHours(23, 59, 59, 999);

    return this.model.find({
      data: { $gte: inicioDoDia, $lte: fimDoDia },
      status,
    }).lean(); // .lean() retorna objetos JS puros, mais leves para o Domain Service.
  }
}

module.exports = CirurgiaRepository;