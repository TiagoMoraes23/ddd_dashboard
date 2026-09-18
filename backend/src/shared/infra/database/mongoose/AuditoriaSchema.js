const mongoose = require('mongoose');

const AuditoriaSchema = new mongoose.Schema(
  {
    usuarioId: { type: String },
    usuarioUsername: { type: String },
    acao: { type: String, required: true },
    recurso: { type: String, required: true },
    recursoId: { type: String },
    detalhes: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: 'criadoEm', updatedAt: false },
  }
);

module.exports = mongoose.model('Auditoria', AuditoriaSchema, 'auditoria');
