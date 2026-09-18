const UsuarioRepository = require('../../infra/repositories/UsuarioRepository');
const DeletarUsuarioUseCase = require('./DeletarUsuarioUseCase');
const DeletarUsuarioController = require('../../infra/http/controllers/DeletarUsuarioController');

const usuarioRepository = new UsuarioRepository();
const deletarUsuarioUseCase = new DeletarUsuarioUseCase(usuarioRepository);
const deletarUsuarioController = new DeletarUsuarioController(deletarUsuarioUseCase);

module.exports = { deletarUsuarioController };
