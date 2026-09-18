const UsuarioRepository = require('../../infra/repositories/UsuarioRepository');
const AtualizarUsuarioUseCase = require('./AtualizarUsuarioUseCase');
const AtualizarUsuarioController = require('../../infra/http/controllers/AtualizarUsuarioController');

const usuarioRepository = new UsuarioRepository();
const atualizarUsuarioUseCase = new AtualizarUsuarioUseCase(usuarioRepository);
const atualizarUsuarioController = new AtualizarUsuarioController(atualizarUsuarioUseCase);

module.exports = { atualizarUsuarioController };
