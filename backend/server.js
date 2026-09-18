const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pinoHttp = require('pino-http');

const pacientesRoutes = require('./src/modules/pacientes/infra/http/routes/pacientes.routes');
const cirurgiasRoutes = require('./src/modules/cirurgias/infra/http/routes/cirurgias.routes');
const dashboardRoutes = require('./src/modules/dashboard/infra/http/routes/dashboard.routes');
const authRoutes = require('./src/modules/identity/infra/http/routes/auth.routes');
const usuariosRoutes = require('./src/modules/identity/infra/http/routes/usuarios.routes');
const relatoriosRoutes = require('./src/modules/relatorios/infra/http/routes/relatorios.routes');
const ensureAuthenticated = require('./src/shared/infra/http/middlewares/ensureAuthenticated');
const errorHandler = require('./src/shared/infra/http/middlewares/errorHandler');
const getHealthStatus = require('./src/shared/infra/http/getHealthStatus');
const LogPacienteSubscriber = require('./src/modules/pacientes/subscribers/LogPacienteSubscriber');
const AuditoriaSubscriber = require('./src/shared/infra/events/AuditoriaSubscriber');

const { corsOriginHandler } = require('./src/shared/config/cors');
const logger = require('./src/shared/config/logger');

const app = express();
app.use(helmet());
app.use(pinoHttp({ logger }));
app.use(express.json());
app.use(cookieParser());
// credentials: true é obrigatório pro navegador enviar/aceitar o cookie
// httpOnly de autenticação em requisições cross-site — não funciona com origin "*", só com allowlist explícita.
app.use(cors({ origin: corsOriginHandler, credentials: true }));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/consultorio')
  .then(() => logger.info('MongoDB conectado com sucesso via infraestrutura DDD!'))
  .catch((err) => logger.error({ err }, 'Erro fatal na conexão do banco.'));

// Liga os ouvintes do EventBus — sem isso, quem publica um evento (ex.:
// AgendarCirurgiaUseCase) fala para o vazio, sem nenhum efeito real.
LogPacienteSubscriber.setup();
AuditoriaSubscriber.setup();

// Health check real: reporta o estado da conexão com o Mongo em vez de só
// confirmar que o processo Express está de pé (o que sempre seria "ok" mesmo
// com o banco fora do ar).
app.get('/', (req, res) => {
  const { httpStatus, body } = getHealthStatus(mongoose.connection.readyState);
  res.status(httpStatus).json(body);
});

// Rota leve para o frontend manter a sessão validada e o servidor acordado
// (hospedagens gratuitas costumam hibernar após um período de inatividade) —
// ver o useEffect de ping em App.jsx, que bate aqui a cada 10 minutos.
// Exige token (ensureAuthenticated): um 401 aqui já dispara logout automático
// via o interceptor global de api/client.js, sem precisar tratar no ping em si.
app.get('/api/v2/ping', ensureAuthenticated, (req, res) => {
  res.status(200).send('pong');
});

// Login é público — precisa ser acessível sem token.
app.use('/api/v2/auth', authRoutes);

// Registro dos Módulos Isolados (Contratos V2) — protegidos por JWT.
app.use('/api/v2/pacientes', ensureAuthenticated, pacientesRoutes);
app.use('/api/v2/cirurgias', ensureAuthenticated, cirurgiasRoutes);
app.use('/api/v2/dashboard', ensureAuthenticated, dashboardRoutes);
app.use('/api/v2/usuarios', ensureAuthenticated, usuariosRoutes);
app.use('/api/v2/relatorios', ensureAuthenticated, relatoriosRoutes);

// Precisa vir depois de todas as rotas: é assim que o Express reconhece um
// error handler (4 argumentos) e o aciona só quando algo dá errado.
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Servidor rodando na porta ${PORT}`));