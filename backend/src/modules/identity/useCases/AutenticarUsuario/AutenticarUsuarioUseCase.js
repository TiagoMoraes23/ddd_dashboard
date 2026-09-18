const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../../../../shared/config/jwt');
const Usuario = require('../../domain/Usuario');
const Role = require('../../domain/valueObjects/Role');

class AutenticarUsuarioUseCase {
  constructor(usuarioRepository) {
    this.usuarioRepository = usuarioRepository;
  }

  async execute({ username, password }) {
    if (!username || !password) {
      throw new Error('Usuário ou senha incorretos.');
    }

    const usuarioEncontrado = await this.usuarioRepository.buscarPorUsuario(username);

    if (!usuarioEncontrado) {
      throw new Error('Usuário ou senha incorretos.');
    }

    const senhaCorreta = await bcrypt.compare(password, usuarioEncontrado.password);
    if (!senhaCorreta) {
      throw new Error('Usuário ou senha incorretos.');
    }

    const usuario = new Usuario({
      id: usuarioEncontrado._id.toString(),
      username: usuarioEncontrado.username,
      role: new Role(usuarioEncontrado.role),
    });

    const token = jwt.sign(usuario.paraJSON(), JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return { usuario: usuario.paraJSON(), token };
  }
}

module.exports = AutenticarUsuarioUseCase;