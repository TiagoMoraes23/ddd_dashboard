const Paciente = require('../../domain/Paciente');
const Cpf = require('../../domain/valueObjects/Cpf');

class PacienteRepository {
  constructor(pacienteModel) {
    this.model = pacienteModel;
  }

  /**
   * @param {string} [cpfOriginal] - CPF usado para localizar o documento a atualizar,
   * quando diferente de `paciente.cpf` (edição que troca o próprio CPF). Sem isso, o
   * upsert por CPF abaixo não acharia o documento existente e criaria um duplicado
   * com o CPF novo em vez de corrigir o registro.
   */
  async salvar(paciente, cpfOriginal) {
    const persistenceData = {
      nome: paciente.nome,
      cpf: paciente.cpf.getValue(),
      convenio: paciente.convenio,
      dataRnm: paciente.dataRnm,
      contato: paciente.contato,
      observacoes: paciente.observacoes,
      linkArquivos: paciente.linkArquivos,
      fornecedor: paciente.fornecedor,
      ultimosFornecedores: paciente.ultimosFornecedores,
      ativo: paciente.ativo,
    };

    
    await this.model.findOneAndUpdate(
      { cpf: cpfOriginal || paciente.cpf.getValue() },
      {
        $set: persistenceData,
        $setOnInsert: { _id: paciente.id },
      },
      { new: true, upsert: true }
    );
  }

  async buscarPorCpf(cpfString) {
    const doc = await this.model.findOne({ cpf: cpfString });
    if (!doc) return null;

    return this._toDomain(doc);
  }

  /**
   * Usa $expr com $toString em vez de um
   * `findOne({ _id: id })` direto: pacientes legados guardam `_id` como
   * ObjectId nativo, enquanto o schema tipa o campo como String (para
   * aceitar o UUID gerado pelo Agregado em pacientes novos) — um `findOne`
   * direto não bate contra o ObjectId legado.
   */
  async buscarPorId(id) {
    const doc = await this.model.findOne({ $expr: { $eq: [{ $toString: '$_id' }, id] } });
    if (!doc) return null;

    return this._toDomain(doc);
  }

  async findAll() {
    const docs = await this.model.find();
    return docs.map((doc) => this._toDomain(doc));
  }

  _toDomain(doc) {
    return new Paciente({
      id: doc._id.toString(),
      nome: doc.nome,
      cpf: Cpf.reconstituir(doc.cpf),
      convenio: doc.convenio,
      dataRnm: doc.dataRnm,
      contato: doc.contato,
      observacoes: doc.observacoes,
      linkArquivos: doc.linkArquivos,
      fornecedor: doc.fornecedor,
      ultimosFornecedores: doc.ultimosFornecedores,
      ativo: doc.ativo,
    });
  }
}

module.exports = PacienteRepository;