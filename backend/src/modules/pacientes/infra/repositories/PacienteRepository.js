const Paciente = require('../../domain/Paciente');
const Cpf = require('../../domain/valueObjects/Cpf');

class PacienteRepository {
  /**
   * Recebe o modelo do Mongoose por Injeção de Dependência
   * @param {Object} pacienteModel - O modelo Mongoose injetado
   */
  constructor(pacienteModel) {
    this.model = pacienteModel;
  }

  /**
   * @param {Paciente} paciente - Entidade de Domínio
   * @param {string} [cpfOriginal] - CPF usado para localizar o documento a atualizar,
   * quando diferente de `paciente.cpf` (edição que troca o próprio CPF). Sem isso, o
   * upsert por CPF abaixo não acharia o documento existente e criaria um duplicado
   * com o CPF novo em vez de corrigir o registro.
   */
  async salvar(paciente, cpfOriginal) {
    // Conversão do Domínio (Agregado) para Objeto do Banco
    const persistenceData = {
      nome: paciente.nome,
      cpf: paciente.cpf.getValue(), // Extrai a string limpa do Value Object
      convenio: paciente.convenio,
      dataRnm: paciente.dataRnm,
      contato: paciente.contato,
      observacoes: paciente.observacoes,
      linkArquivos: paciente.linkArquivos,
      fornecedor: paciente.fornecedor,
      ultimosFornecedores: paciente.ultimosFornecedores,
      ativo: paciente.ativo,
    };

    // Casa o upsert por CPF (único e obrigatório), não por _id: pacientes legados têm
    // _id como ObjectId nativo, enquanto o Agregado gera um UUID novo — casar por _id
    // faria o upsert falhar em bater com o registro legado e criar duplicata.
    // $set (em vez de um objeto "cru") evita substituir o documento inteiro, o que
    // apagaria campos não mapeados aqui como "cirurgias". $setOnInsert só define o
    // _id (UUID do Domínio) quando o documento é realmente novo.
    await this.model.findOneAndUpdate(
      { cpf: cpfOriginal || paciente.cpf.getValue() },
      {
        $set: persistenceData,
        $setOnInsert: { _id: paciente.id },
      },
      { new: true, upsert: true }
    );
  }

  /**
   * Busca um paciente pelo CPF
   * @param {string} cpfString - O CPF para busca (apenas números)
   * @returns {Promise<Paciente|null>}
   */
  async buscarPorCpf(cpfString) {
    const doc = await this.model.findOne({ cpf: cpfString });
    if (!doc) return null;

    return this._toDomain(doc);
  }

  /**
   * Busca um paciente pelo _id. Usa $expr com $toString em vez de um
   * `findOne({ _id: id })` direto: pacientes legados guardam `_id` como
   * ObjectId nativo, enquanto o schema tipa o campo como String (para
   * aceitar o UUID gerado pelo Agregado em pacientes novos) — um `findOne`
   * direto não bate contra o ObjectId legado. Mesmo padrão já usado nos
   * $lookup de paciente em BuscarCirurgiasQuery/ObterEstatisticasDashboardQuery.
   * @param {string} id
   * @returns {Promise<Paciente|null>}
   */
  async buscarPorId(id) {
    const doc = await this.model.findOne({ $expr: { $eq: [{ $toString: '$_id' }, id] } });
    if (!doc) return null;

    return this._toDomain(doc);
  }

  /**
   * Retorna todos os pacientes cadastrados
   * @returns {Promise<Paciente[]>}
   */
  async findAll() {
    const docs = await this.model.find();
    return docs.map((doc) => this._toDomain(doc));
  }

  /**
   * Método utilitário privado para mapear o Documento Mongoose de volta para a Entidade de Domínio
   * @param {Object} doc - Documento do Mongoose
   * @returns {Paciente}
   * @private
   */
  _toDomain(doc) {
    return new Paciente({
      id: doc._id.toString(),
      nome: doc.nome,
      cpf: Cpf.reconstituir(doc.cpf), // Reconstrução tolera CPF legado inválido — só a edição valida de fato.
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