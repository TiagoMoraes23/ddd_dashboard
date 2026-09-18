const UsuarioRepository = require('../../infra/repositories/UsuarioRepository');
const CriarUsuarioUseCase = require('./CriarUsuarioUseCase');
const CriarUsuarioController = require('../../infra/http/controllers/CriarUsuarioController');

const usuarioRepository = new UsuarioRepository();
const criarUsuarioUseCase = new CriarUsuarioUseCase(usuarioRepository);
const criarUsuarioController = new CriarUsuarioController(criarUsuarioUseCase);

module.exports = { criarUsuarioController };
