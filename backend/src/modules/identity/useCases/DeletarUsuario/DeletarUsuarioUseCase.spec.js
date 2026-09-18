const DeletarUsuarioUseCase = require('./DeletarUsuarioUseCase');

const mockUsuarioRepository = {
  buscarPorId: jest.fn(),
  deletar: jest.fn(),
};

describe('UseCase: DeletarUsuario', () => {
  let deletarUsuarioUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    deletarUsuarioUseCase = new DeletarUsuarioUseCase(mockUsuarioRepository);
  });

  describe('Cenários de Sucesso', () => {
    it('deve apagar um usuário diferente do usuário logado', async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue({ _id: 'alvo' });

      await deletarUsuarioUseCase.execute('alvo', 'logado');

      expect(mockUsuarioRepository.deletar).toHaveBeenCalledWith('alvo');
    });
  });

  describe('Cenários de Falha', () => {
    it('deve lançar erro ao tentar apagar o próprio usuário logado', async () => {
      await expect(deletarUsuarioUseCase.execute('mesmo-id', 'mesmo-id'))
        .rejects.toThrow('Você não pode apagar o seu próprio usuário.');
      expect(mockUsuarioRepository.buscarPorId).not.toHaveBeenCalled();
    });

    it('deve lançar erro se o usuário a ser apagado não existir', async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(null);

      await expect(deletarUsuarioUseCase.execute('inexistente', 'logado'))
        .rejects.toThrow('Usuário não encontrado.');
      expect(mockUsuarioRepository.deletar).not.toHaveBeenCalled();
    });
  });
});
