const UsuarioRepository = require('../../infra/repositories/UsuarioRepository');
const AutenticarUsuarioUseCase = require('./AutenticarUsuarioUseCase');
const AutenticarUsuarioController = require('../../infra/http/controllers/AutenticarUsuarioController');

const usuarioRepository = new UsuarioRepository();

const autenticarUsuarioUseCase = new AutenticarUsuarioUseCase(usuarioRepository);

const autenticarUsuarioController = new AutenticarUsuarioController(autenticarUsuarioUseCase);

module.exports = { autenticarUsuarioController };