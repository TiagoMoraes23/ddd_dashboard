const ListarUsuariosUseCase = require('./ListarUsuariosUseCase');

const mockUsuarioRepository = {
  listarTodos: jest.fn(),
};

describe('UseCase: ListarUsuarios', () => {
  it('deve retornar a lista de usuários do repositório', async () => {
    const usuarios = [{ _id: '1', username: 'tiago', role: 'admin' }];
    mockUsuarioRepository.listarTodos.mockResolvedValue(usuarios);

    const listarUsuariosUseCase = new ListarUsuariosUseCase(mockUsuarioRepository);
    const resultado = await listarUsuariosUseCase.execute();

    expect(resultado).toBe(usuarios);
  });
});
