const mongoose = require('mongoose');

const CirurgiaSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    pacienteId: {
      // Deve ser String para corresponder ao ID (UUID) do agregado Paciente.
      type: String,
      ref: 'Paciente',
      required: true,
    },
    descricao: { type: String },
    status: { type: String, default: 'Agendamento Pendente' },
    data: { type: Date },
    horario: { type: String },
    opme: { type: String },
    fornecedor: { type: String },
    hospital: { type: String },
    // Array porque uma cirurgia pode tratar mais de uma articulação
    // simultaneamente (ex.: "Ombros e cotovelos", achado em dado real).
    regiao: { type: [String] },
    observacoes: { type: String },
  },
  {
    timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  }
);

module.exports = mongoose.model('Cirurgia', CirurgiaSchema);