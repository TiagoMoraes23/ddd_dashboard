import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const OLD_MONGO_URI = process.env.OLD_MONGO_URI;
const NEW_MONGO_URI = process.env.NEW_MONGO_URI;

if (!OLD_MONGO_URI || !NEW_MONGO_URI) {
    console.error("ERRO: As variáveis OLD_MONGO_URI e NEW_MONGO_URI devem estar definidas no seu ficheiro .env para que a migração possa ser executada.");
    process.exit(1);
}

const oldPacienteSchema = new mongoose.Schema({}, { strict: false, collection: 'pacientes' });

const newCirurgiaSchema = new mongoose.Schema({
    descricao: { type: String },
    data: { type: Date },
    fornecedor: { type: String },
    hospital: { type: String },
    regiao: { type: String },
    status: {
        type: String,
        enum: ['Autorizado', 'Agendado', 'Realizado', 'Agendamento Pendente', 'Senha expirada', 'Cancelado (outro motivo)'],
        default: 'Autorizado'
    }
}, { _id: false });

const newPacienteSchema = new mongoose.Schema({
    cpf: { type: String, required: true, unique: true },
    nome: { type: String, required: true },
    convenio: String,
    fornecedor: String,
    ultimosFornecedores: [String],
    cirurgias: [newCirurgiaSchema],
    contato: String,
    observacoes: String,
    linkArquivos: String,
    dataRnm: Date,
    statusGeral: { type: String, enum: ['Ativo', 'Inativo'], default: 'Ativo' }
}, { timestamps: true });

const migrateData = async () => {
    let oldDb, newDb;
    try {
        console.log('Conectando às bases de dados...');
        oldDb = await mongoose.createConnection(OLD_MONGO_URI);
        newDb = await mongoose.createConnection(NEW_MONGO_URI);
        console.log('Conexão estabelecida com sucesso.');

        const OldPaciente = oldDb.model('OldPaciente', oldPacienteSchema);
        const NewPaciente = newDb.model('Paciente', newPacienteSchema);

        console.log('Buscando pacientes da base de dados antiga...');
        const oldPacientes = await OldPaciente.find({}).lean();
        console.log(`-> ${oldPacientes.length} pacientes encontrados.`);

        if (oldPacientes.length === 0) {
            console.log('Nenhum paciente para migrar.');
            return;
        }

        console.log('Transformando dados das cirurgias...');
        const newPacientesData = oldPacientes.map(oldPatient => {
            const transformedCirurgias = (oldPatient.cirurgias || []).map(cirurgiaString => {
                const regex = /(.*?):\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*Região:\s*(.*?)\s*-\s*Fornecedor\s*(.*)/i;
                const match = cirurgiaString.match(regex);

                if (match) {
                    const [, hospital, dateStr, regiao, fornecedor] = match;
                    
                    const [day, month, year] = dateStr.split('/');
                    const dateObject = new Date(`${year}-${month}-${day}`);

                    return {
                        hospital: hospital.trim(),
                        data: !isNaN(dateObject.getTime()) ? dateObject : null,
                        regiao: regiao.trim(),
                        fornecedor: fornecedor.trim(),
                        descricao: `Migrado de: "${cirurgiaString}"`,
                        status: 'Autorizado'
                    };
                }

                console.warn(`   - Formato de cirurgia não reconhecido para o paciente ${oldPatient.nome}: "${cirurgiaString}"`);
                return { descricao: cirurgiaString };
            });

            return {
                ...oldPatient,
                cirurgias: transformedCirurgias,
            };
        });
        console.log('-> Transformação concluída.');

        console.log(`Limpando a coleção 'pacientes' na nova base de dados...`);
        await NewPaciente.deleteMany({});
        console.log('-> Coleção limpa.');

        console.log('Inserindo dados migrados na nova base de dados...');
        await NewPaciente.insertMany(newPacientesData);
        console.log(`-> ${newPacientesData.length} pacientes migrados com sucesso!`);

        console.log('\n✨ Migração concluída! ✨');

    } catch (error) {
        console.error('\n❌ Ocorreu um erro durante a migração:', error);
        process.exit(1);
    } finally {
        if (oldDb) await oldDb.close();
        if (newDb) await newDb.close();
        console.log('\nConexões com as bases de dados fechadas.');
    }
};

migrateData();