const mongoose = require('mongoose');

const CirurgiaEmbutidaSchema = new mongoose.Schema({
    descricao: String,
    fornecedor: String,
    status: String,
    data: String,
    horario: String
});

const PacienteSchema = new mongoose.Schema({
  // String para aceitar o UUID gerado pelo Agregado de Domínio em pacientes novos
  _id: {
    type: String,
  },
  nome: {
    type: String,
    required: true,
  },
  cpf: {
    type: String,
    required: true,
    unique: true,
  },
  convenio: String,
  dataRnm: Date,
  contato: String,
  observacoes: String,
  linkArquivos: String,
  // um paciente pode ter mais de um fornecedor atual ao
  // mesmo tempo (um por articulação, por exemplo).
  fornecedor: [String],
  ultimosFornecedores: [{
    _id: false,
    fornecedor: String,
    data: Date,
  }],
  ativo: {
    type: Boolean,
    default: true,
    index: true,
  },
  cirurgias: [CirurgiaEmbutidaSchema]
}, {
  timestamps: true,
  _id: true,
});



const PacienteModel = mongoose.model('Paciente', PacienteSchema);

module.exports = mongoose.models.Paciente || mongoose.model('Paciente', PacienteSchema, 'pacientes');