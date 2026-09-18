const UsuarioRepository = require('../../infra/repositories/UsuarioRepository');
const AutenticarUsuarioUseCase = require('./AutenticarUsuarioUseCase');
const AutenticarUsuarioController = require('../../infra/http/controllers/AutenticarUsuarioController');

// 1. Instancia o Repositório
const usuarioRepository = new UsuarioRepository();

// 2. Injeta o Repositório no Caso de Uso
const autenticarUsuarioUseCase = new AutenticarUsuarioUseCase(usuarioRepository);

// 3. Injeta o Caso de Uso no Controlador
const autenticarUsuarioController = new AutenticarUsuarioController(autenticarUsuarioUseCase);

module.exports = { autenticarUsuarioController };