// CORS restrito às origens conhecidas do frontend — antes cors() sem opções
// aceitava qualquer origem, o que facilita força bruta/scraping via browser
// contra uma API que guarda dados reais de pacientes (contexto LGPD).
// FRONTEND_URL permite adicionar uma origem extra sem alterar código.
const ORIGENS_PERMITIDAS = [
  'http://localhost:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

function corsOriginHandler(origin, callback) {
  // Requisições sem header Origin (curl, Postman, health checks de infra)
  // não são navegadores fazendo CORS — deixa passar.
  if (!origin || ORIGENS_PERMITIDAS.includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error('Origem não permitida pelo CORS.'));
}

module.exports = { ORIGENS_PERMITIDAS, corsOriginHandler };
