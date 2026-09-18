// dotenv/config carrega o .env antes da suíte rodar — necessário desde que
// JWT_SECRET passou a ser obrigatório (shared/config/jwt.js lança erro se
// process.env.JWT_SECRET não estiver definido, e os specs importam esse
// módulo diretamente, sem passar pelo dotenv.config() de server.js).
module.exports = {
  setupFiles: ['dotenv/config'],
};
