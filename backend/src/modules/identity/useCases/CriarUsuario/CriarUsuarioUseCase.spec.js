const CriarUsuarioUseCase = require('./CriarUsuarioUseCase');

const mockUsuarioRepository = {
  buscarPorUsuario: jest.fn(),
  criar: jest.fn(),
};

describe('UseCase: CriarUsuario', () => {
  let criarUsuarioUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    criarUsuarioUseCase = new CriarUsuarioUseCase(mockUsuarioRepository);
  });

  describe('Cenários de Sucesso', () => {
    it('deve criar um usuário com role padrão quando nenhuma role for informada', async () => {
      mockUsuarioRepository.buscarPorUsuario.mockResolvedValue(null);
      mockUsuarioRepository.criar.mockResolvedValue({ _id: '1', username: 'novo', role: 'padrao' });

      const resultado = await criarUsuarioUseCase.execute({ username: 'novo', password: 'senha123' });

      expect(resultado).toEqual({ id: '1', username: 'novo', role: 'padrao' });
      expect(mockUsuarioRepository.criar).toHaveBeenCalledWith({ username: 'novo', password: 'senha123', role: 'padrao' });
    });

    it('deve criar um usuário admin quando role for explicitamente "admin"', async () => {
      mockUsuarioRepository.buscarPorUsuario.mockResolvedValue(null);
      mockUsuarioRepository.criar.mockResolvedValue({ _id: '2', username: 'chefe', role: 'admin' });

      await criarUsuarioUseCase.execute({ username: 'chefe', password: 'senha123', role: 'admin' });

      expect(mockUsuarioRepository.criar).toHaveBeenCalledWith({ username: 'chefe', password: 'senha123', role: 'admin' });
    });
  });

  describe('Cenários de Falha', () => {
    it('deve lançar erro se username ou password não forem fornecidos', async () => {
      await expect(criarUsuarioUseCase.execute({ username: '', password: '' }))
        .rejects.toThrow('Usuário e senha são obrigatórios.');
      expect(mockUsuarioRepository.criar).not.toHaveBeenCalled();
    });

    it('deve lançar erro se a role informada for inválida', async () => {
      await expect(criarUsuarioUseCase.execute({ username: 'novo', password: 'senha123', role: 'superadmin' }))
        .rejects.toThrow('Role inválida: superadmin');
      expect(mockUsuarioRepository.buscarPorUsuario).not.toHaveBeenCalled();
    });

    it('deve lançar erro se o username já existir', async () => {
      mockUsuarioRepository.buscarPorUsuario.mockResolvedValue({ _id: 'existente' });

      await expect(criarUsuarioUseCase.execute({ username: 'ja-existe', password: 'senha123' }))
        .rejects.toThrow('Já existe um usuário cadastrado com este nome de usuário.');
      expect(mockUsuarioRepository.criar).not.toHaveBeenCalled();
    });
  });
});
