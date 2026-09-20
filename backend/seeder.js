const mongoose = require('mongoose');
const dotenv = require('dotenv');
const UsuarioModel = require('./src/modules/identity/infra/database/mongoose/UsuarioSchema');

dotenv.config();


const usersToSeed = [
  { username: 'admin', envVar: 'SEED_ADMIN_PASSWORD', role: 'admin' },
  { username: 'user', envVar: 'SEED_USER_PASSWORD', role: 'padrao' },
];

function resolverUsuarios() {
  return usersToSeed.map(({ username, envVar, role }) => {
    const password = process.env[envVar];
    if (!password) {
      throw new Error(
        `Variável de ambiente ${envVar} não definida — informe a senha do usuário '${username}' antes de rodar o seeder.`
      );
    }
    return { username, password, role };
  });
}

const importData = async () => {
  try {
    const users = resolverUsuarios();

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB conectado para o seeder...');

    await UsuarioModel.deleteMany();
    console.log('Utilizadores antigos apagados...');

    
    for (const userData of users) {
      const user = new UsuarioModel(userData);
      await user.save();
    }

    console.log('Novos utilizadores importados com sucesso e senhas encriptadas!');

    process.exit();
  } catch (error) {
    console.error(`Erro no seeder: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await UsuarioModel.deleteMany();
    console.log('Todos os utilizadores foram apagados!');
    process.exit();
  } catch (error) {
    console.error(`Erro ao apagar dados: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
