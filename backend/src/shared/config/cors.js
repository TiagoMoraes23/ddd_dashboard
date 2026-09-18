const ORIGENS_PERMITIDAS = [
  'http://localhost:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

function corsOriginHandler(origin, callback) {

  if (!origin || ORIGENS_PERMITIDAS.includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error('Origem não permitida pelo CORS.'));
}

module.exports = { ORIGENS_PERMITIDAS, corsOriginHandler };
