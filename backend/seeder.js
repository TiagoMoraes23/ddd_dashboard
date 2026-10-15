import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const users = [
  {
    username: 'admin',
    password: process.env.SEED_ADMIN_PASSWORD,
    role: 'admin',
  },
  {
    username: 'user',
    password: process.env.SEED_USER_PASSWORD,
    role: 'padrao',
  },
];

const importData = async () => {
  if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_USER_PASSWORD) {
    console.error('ERRO: As variáveis SEED_ADMIN_PASSWORD e SEED_USER_PASSWORD devem estar definidas no seu ficheiro .env para que o seeder possa ser executado.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB conectado para o seeder...');

    await User.deleteMany();
    console.log('Utilizadores antigos apagados...');

    for (const userData of users) {
      const user = new User(userData);
      await user.save();
    }
    
    console.log('Novos utilizadores importados com sucesso e senhas encriptadas!');
    
    process.exit();
  } catch (error) {
    console.error(`Erro no seeder: ${error}`);
    process.exit(1);
  }
};

const destroyData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await User.deleteMany();
        console.log('Todos os utilizadores foram apagados!');
        process.exit();
    } catch (error) {
        console.error(`Erro ao apagar dados: ${error}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
