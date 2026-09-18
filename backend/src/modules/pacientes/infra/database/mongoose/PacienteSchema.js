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
  // (mesmo padrão do CirurgiaSchema). Pacientes legados mantêm seu ObjectId original
  // como string — o upsert em PacienteRepository.salvar() casa por CPF, não por _id,
  // então isso não afeta a leitura/atualização de registros legados.
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
  // Negócio dinâmico: um paciente pode ter mais de um fornecedor atual ao
  // mesmo tempo (um por articulação, por exemplo) — migrado de string livre
  // ("Nome1 / Nome2") para array — ver backend/scripts/migrarFornecedorAtual.js.
  fornecedor: [String],
  // Migrado de array de strings livres ("Nome: dd/mm/aaaa") para objeto
  // estruturado — ver backend/scripts/migrarUltimosFornecedores.js.
  ultimosFornecedores: [{
    _id: false,
    fornecedor: String,
    data: Date,
  }],
  ativo: {
    type: Boolean,
    default: true,
    index: true, // Adiciona um índice para otimizar consultas por pacientes ativos/inativos.
  },
  cirurgias: [CirurgiaEmbutidaSchema]
}, {
  timestamps: true, // Adiciona createdAt e updatedAt automaticamente.
  _id: true, // Garante que o _id seja gerenciado pelo Mongoose.
});



const PacienteModel = mongoose.model('Paciente', PacienteSchema);

module.exports = mongoose.models.Paciente || mongoose.model('Paciente', PacienteSchema, 'pacientes');