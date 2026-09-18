// Fonte única do segredo/expiração do JWT — antes duplicado entre o use case
// que assina o token e o middleware que precisaria verificá-lo, arriscando
// os dois valores divergirem silenciosamente.
//
// Sem fallback: dados de pacientes reais (contexto de saúde/LGPD) tornam
// inaceitável subir o servidor com um segredo previsível e público no
// histórico do repositório. Falhar a inicialização é preferível a rodar
// com um JWT_SECRET que qualquer um com acesso ao código pode forjar.
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar o servidor.'
  );
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1d';

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };
