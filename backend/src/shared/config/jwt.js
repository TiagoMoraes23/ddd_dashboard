if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar o servidor.'
  );
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1d';

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };
