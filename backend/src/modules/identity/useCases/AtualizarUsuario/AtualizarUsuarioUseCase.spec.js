const AtualizarUsuarioUseCase = require('./AtualizarUsuarioUseCase');

const mockUsuarioRepository = {
  buscarPorId: jest.fn(),
  atualizar: jest.fn(),
};

describe('UseCase: AtualizarUsuario', () => {
  let atualizarUsuarioUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    atualizarUsuarioUseCase = new AtualizarUsuarioUseCase(mockUsuarioRepository);
  });

  describe('Cenários de Sucesso', () => {
    it('deve atualizar apenas a role quando só ela for informada', async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue({ _id: '1', username: 'tiago', role: 'padrao' });
      mockUsuarioRepository.atualizar.mockResolvedValue({ _id: '1', username: 'tiago', role: 'admin' });

      const resultado = await atualizarUsuarioUseCase.execute('1', { role: 'admin' });

      expect(resultado).toEqual({ id: '1', username: 'tiago', role: 'admin' });
      expect(mockUsuarioRepository.atualizar).toHaveBeenCalledWith('1', {
        username: undefined, password: undefined, role: 'admin',
      });
    });

    it('deve atualizar username sem exigir/validar role quando ela não for informada', async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue({ _id: '1', username: 'tiago', role: 'padrao' });
      mockUsuarioRepository.atualizar.mockResolvedValue({ _id: '1', username: 'novo-nome', role: 'padrao' });

      const resultado = await atualizarUsuarioUseCase.execute('1', { username: 'novo-nome' });

      expect(resultado).toEqual({ id: '1', username: 'novo-nome', role: 'padrao' });
      expect(mockUsuarioRepository.atualizar).toHaveBeenCalledWith('1', {
        username: 'novo-nome', password: undefined, role: undefined,
      });
    });
  });

  describe('Cenários de Falha', () => {
    it('deve lançar erro se o usuário não existir', async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(null);

      await expect(atualizarUsuarioUseCase.execute('inexistente', { role: 'admin' }))
        .rejects.toThrow('Usuário não encontrado.');
      expect(mockUsuarioRepository.atualizar).not.toHaveBeenCalled();
    });

    it('deve lançar erro se a role informada for inválida', async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue({ _id: '1', username: 'tiago', role: 'padrao' });

      await expect(atualizarUsuarioUseCase.execute('1', { role: 'superadmin' }))
        .rejects.toThrow('Role inválida: superadmin');
      expect(mockUsuarioRepository.atualizar).not.toHaveBeenCalled();
    });
  });
});
