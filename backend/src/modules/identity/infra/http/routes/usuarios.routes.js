const { Router } = require('express');
const ensureAdmin = require('../../../../../shared/infra/http/middlewares/ensureAdmin');
const { listarUsuariosController } = require('../../../useCases/ListarUsuarios');
const { criarUsuarioController } = require('../../../useCases/CriarUsuario');
const { atualizarUsuarioController } = require('../../../useCases/AtualizarUsuario');
const { deletarUsuarioController } = require('../../../useCases/DeletarUsuario');

const usuariosRouter = Router();

// Gestão de usuários é restrita a admins. ensureAuthenticated já roda antes
// (aplicado no server.js para todo o prefixo /api/v2), então req.user existe aqui.
usuariosRouter.use(ensureAdmin);

usuariosRouter.get('/', listarUsuariosController.handle.bind(listarUsuariosController));
usuariosRouter.post('/', criarUsuarioController.handle.bind(criarUsuarioController));
usuariosRouter.put('/:id', atualizarUsuarioController.handle.bind(atualizarUsuarioController));
usuariosRouter.delete('/:id', deletarUsuarioController.handle.bind(deletarUsuarioController));

module.exports = usuariosRouter;
