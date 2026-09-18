const CirurgiaModel = require('../database/mongoose/CirurgiaSchema');
const Cirurgia = require('../../domain/Cirurgia');

class CirurgiaRepository {
  constructor(model = CirurgiaModel) {
    this.model = model;
  }

  async salvar(cirurgia) {
    const dadosPersistencia = {
      _id: cirurgia.id,
      pacienteId: cirurgia.pacienteId,
      descricao: cirurgia.descricao,
      status: cirurgia.status.getValue(),
      data: cirurgia.data,
      horario: cirurgia.horario,
      opme: cirurgia.opme,
      fornecedor: cirurgia.fornecedor,
      hospital: cirurgia.hospital,
      regiao: cirurgia.regiao,
      observacoes: cirurgia.observacoes,
    };

    const cirurgiaSalva = await this.model.findOneAndUpdate(
      { _id: cirurgia.id },
      dadosPersistencia,
      { new: true, upsert: true }
    );

    return cirurgiaSalva;
  }

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

  async deletar(id) {
    await this.model.deleteOne({ _id: id });
  }

  async buscarPorDataEStatus(data, status) {
    const inicioDoDia = new Date(data);
    inicioDoDia.setUTCHours(0, 0, 0, 0);

    const fimDoDia = new Date(data);
    fimDoDia.setUTCHours(23, 59, 59, 999);

    return this.model.find({
      data: { $gte: inicioDoDia, $lte: fimDoDia },
      status,
    }).lean();
  }
}

module.exports = CirurgiaRepository;