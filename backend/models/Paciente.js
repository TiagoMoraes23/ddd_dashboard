import mongoose from 'mongoose';

const cirurgiaSchema = new mongoose.Schema({
    descricao: { type: String },
    data: { type: Date },
    horario: { 
        type: String,
        match: [/^([0-1]\d|2[0-3]):([0-5]\d)$/, 'O horário deve estar no formato HH:mm']
    },
    opme: { type: String },
    fornecedor: { type: String },
    hospital: { type: String },
    regiao: { type: String },
    status: {
        type: String,
        enum: ['Autorizado', 'Agendado', 'Realizado', 'Agendamento Pendente', 'Senha expirada', 'Cancelado (outro motivo)'],
        default: 'Autorizado'
    }
}, { _id: false });

const pacienteSchema = new mongoose.Schema({
    cpf: { type: String, required: true, unique: true },
    nome: { type: String, required: true },
    convenio: String,
    fornecedor: String,
    ultimosFornecedores: [String],
    
    cirurgias: [cirurgiaSchema],

    contato: String,
    observacoes: String,
    linkArquivos: String,
    dataRnm: Date,

    statusGeral: {
        type: String,
        enum: ['Ativo', 'Inativo'],
        default: 'Ativo'
    }
}, { timestamps: true });

const Paciente = mongoose.model('Paciente', pacienteSchema);

export default Paciente;
