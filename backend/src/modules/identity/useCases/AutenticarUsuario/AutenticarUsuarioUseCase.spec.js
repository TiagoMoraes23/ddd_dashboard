const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AutenticarUsuarioUseCase = require('./AutenticarUsuarioUseCase');
const { JWT_SECRET } = require('../../../../shared/config/jwt');

const mockUsuarioRepository = {
  buscarPorUsuario: jest.fn(),
};

describe('UseCase: AutenticarUsuario', () => {
  let autenticarUsuarioUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    autenticarUsuarioUseCase = new AutenticarUsuarioUseCase(mockUsuarioRepository);
  });

  describe('Cenários de Sucesso', () => {
    it('deve autenticar e retornar um token JWT válido para credenciais corretas', async () => {
      const senhaHash = await bcrypt.hash('senha-correta', 10);
      mockUsuarioRepository.buscarPorUsuario.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        username: 'tiago',
        role: 'admin',
        password: senhaHash,
      });

      const resultado = await autenticarUsuarioUseCase.execute({ username: 'tiago', password: 'senha-correta' });

      expect(resultado.usuario).toEqual({ id: '507f1f77bcf86cd799439011', username: 'tiago', role: 'admin' });
      expect(resultado.usuario.password).toBeUndefined();

      const payload = jwt.verify(resultado.token, JWT_SECRET);
      expect(payload).toMatchObject({ id: '507f1f77bcf86cd799439011', username: 'tiago', role: 'admin' });
    });
  });

  describe('Cenários de Falha', () => {
    it('deve lançar erro genérico se o username não for encontrado', async () => {
      mockUsuarioRepository.buscarPorUsuario.mockResolvedValue(null);

      await expect(autenticarUsuarioUseCase.execute({ username: 'inexistente', password: 'qualquer' }))
        .rejects.toThrow('Usuário ou senha incorretos.');
    });

    it('deve lançar o mesmo erro genérico se a senha estiver incorreta (não vaza qual campo errou)', async () => {
      const senhaHash = await bcrypt.hash('senha-correta', 10);
      mockUsuarioRepository.buscarPorUsuario.mockResolvedValue({
        _id: '1', username: 'tiago', role: 'admin', password: senhaHash,
      });

      await expect(autenticarUsuarioUseCase.execute({ username: 'tiago', password: 'senha-errada' }))
        .rejects.toThrow('Usuário ou senha incorretos.');
    });

    it('deve lançar erro se username ou password não forem fornecidos', async () => {
      await expect(autenticarUsuarioUseCase.execute({ username: '', password: '' }))
        .rejects.toThrow('Usuário ou senha incorretos.');
      expect(mockUsuarioRepository.buscarPorUsuario).not.toHaveBeenCalled();
    });
  });
});
