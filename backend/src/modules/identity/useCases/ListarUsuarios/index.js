const UsuarioRepository = require('../../infra/repositories/UsuarioRepository');
const ListarUsuariosUseCase = require('./ListarUsuariosUseCase');
const ListarUsuariosController = require('../../infra/http/controllers/ListarUsuariosController');

const usuarioRepository = new UsuarioRepository();
const listarUsuariosUseCase = new ListarUsuariosUseCase(usuarioRepository);
const listarUsuariosController = new ListarUsuariosController(listarUsuariosUseCase);

module.exports = { listarUsuariosController };
