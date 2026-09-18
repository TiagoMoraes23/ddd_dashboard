const { Router } = require('express');
const { autenticarUsuarioController } = require('../../../useCases/AutenticarUsuario');
const logoutController = require('../controllers/LogoutController');
const loginRateLimiter = require('../../../../../shared/infra/http/middlewares/loginRateLimiter');

const authRoutes = Router();

authRoutes.post(
  '/login',
  loginRateLimiter,
  autenticarUsuarioController.handle.bind(autenticarUsuarioController)
);

authRoutes.post('/logout', logoutController.handle.bind(logoutController));

module.exports = authRoutes;