const pino = require('pino');

// Logger estruturado único da aplicação — antes os erros eram só
// console.error/console.log espalhados, sem nível, timestamp padronizado
// ou formato consumível por uma ferramenta de agregação de logs.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // O JWT do header Authorization nunca pode ir pro log em texto puro.
  // req.url também é mascarada como cinto de segurança: mesmo com o CPF fora
  // dos parâmetros de rota (PUT/DELETE agora usam /:id), a busca livre ainda
  // aceita CPF via querystring (?q=...), e a URL apareceria ali.
  redact: {
    paths: ['req.headers.authorization', 'req.url'],
    censor: '[Redacted]',
  },
});

module.exports = logger;
