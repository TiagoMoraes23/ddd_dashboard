const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: ['admin', 'padrao'], default: 'padrao' }
}, { timestamps: true });

UsuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// O TERCEIRO PARÂMETRO 'users' É O SEGREDO: FORÇA O MONGOOSE A LER A COLEÇÃO LEGADA!
module.exports = mongoose.model('Usuario', UsuarioSchema, 'users');