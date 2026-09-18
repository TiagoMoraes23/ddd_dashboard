const ExportarCirurgiasUseCase = require('./ExportarCirurgiasUseCase');

describe('ExportarCirurgiasUseCase', () => {
  let buscarPacientesQuery;
  let buscarCirurgiasQuery;
  let useCase;

  beforeEach(() => {
    buscarPacientesQuery = { execute: jest.fn() };
    buscarCirurgiasQuery = { execute: jest.fn() };
    useCase = new ExportarCirurgiasUseCase(buscarPacientesQuery, buscarCirurgiasQuery);
  });

  it('lanca erro se as dependencias obrigatorias nao forem injetadas', () => {
    expect(() => new ExportarCirurgiasUseCase(null, buscarCirurgiasQuery)).toThrow();
    expect(() => new ExportarCirurgiasUseCase(buscarPacientesQuery, null)).toThrow();
  });

  describe('so filtro de paciente', () => {
    it('usa o array de cirurgias completo do paciente (sem filtro adicional)', async () => {
      const dataCirurgia = new Date('2026-04-01');
      buscarPacientesQuery.execute.mockResolvedValue([
        {
          nome: 'Maria', cpf: '111', convenio: 'ConvenioX', fornecedor: ['FornecedorA'],
          dataRnm: new Date('2026-01-01'), ultimosFornecedores: [{ fornecedor: 'FornecedorD', data: new Date('2025-01-01') }],
          cirurgias: [{ status: 'Realizado', data: dataCirurgia, regiao: ['Ombro'] }],
        },
      ]);

      const linhas = await useCase.execute({ filtrosPaciente: { convenio: 'ConvenioX' } });

      expect(buscarPacientesQuery.execute).toHaveBeenCalledWith({ convenio: 'ConvenioX', q: '' });
      expect(buscarCirurgiasQuery.execute).not.toHaveBeenCalled();
      expect(linhas).toEqual([
        {
          nome: 'Maria', cpf: '111', convenio: 'ConvenioX', fornecedorAtual: ['FornecedorA'],
          dataRnm: new Date('2026-01-01'),
          ultimosFornecedores: [{ fornecedor: 'FornecedorD', data: new Date('2025-01-01') }],
          cirurgias: [{ status: 'Realizado', data: dataCirurgia, horario: undefined, opme: undefined, fornecedor: undefined, hospital: undefined, descricao: undefined, regiao: ['Ombro'] }],
        },
      ]);
    });

    it('cobre o filtro "sem cirurgias" (array vazio na linha)', async () => {
      buscarPacientesQuery.execute.mockResolvedValue([
        { nome: 'Joao', cpf: '222', convenio: null, fornecedor: [], dataRnm: null, ultimosFornecedores: [], cirurgias: [] },
      ]);

      const linhas = await useCase.execute({ filtrosPaciente: { semCirurgias: true } });

      expect(linhas).toHaveLength(1);
      expect(linhas[0].cirurgias).toEqual([]);
    });
  });

  describe('so filtro de cirurgia (ou nenhum filtro)', () => {
    it('agrupa linhas achatadas por CPF, usando os campos pacienteXxx projetados', async () => {
      buscarCirurgiasQuery.execute.mockResolvedValue([
        {
          pacienteNome: 'Ana', pacienteCpf: '333', pacienteConvenio: 'ConvenioY', pacienteFornecedor: 'FornecedorA, FornecedorD',
          pacienteDataRnm: new Date('2026-02-01'), pacienteUltimosFornecedores: [{ fornecedor: 'FornecedorD', data: new Date('2025-06-01') }],
          status: 'Realizado', data: new Date('2026-01-01'), regiao: ['Ombro'],
        },
        {
          pacienteNome: 'Ana', pacienteCpf: '333', pacienteConvenio: 'ConvenioY', pacienteFornecedor: 'FornecedorA, FornecedorD',
          pacienteDataRnm: new Date('2026-02-01'), pacienteUltimosFornecedores: [{ fornecedor: 'FornecedorD', data: new Date('2025-06-01') }],
          status: 'Agendamento Pendente', data: new Date('2026-03-01'), regiao: ['Cotovelo'],
        },
      ]);

      const linhas = await useCase.execute({ filtrosCirurgia: { status: 'Realizado' } });

      expect(buscarPacientesQuery.execute).not.toHaveBeenCalled();
      expect(linhas).toHaveLength(1);
      expect(linhas[0].cpf).toBe('333');
      expect(linhas[0].fornecedorAtual).toBe('FornecedorA, FornecedorD');
      expect(linhas[0].cirurgias).toHaveLength(2);
    });

    it('chama buscarCirurgiasQuery mesmo sem nenhum filtro (exportar tudo)', async () => {
      buscarCirurgiasQuery.execute.mockResolvedValue([]);

      await useCase.execute({});

      expect(buscarCirurgiasQuery.execute).toHaveBeenCalledWith({ q: '' });
    });

    it('nao conta sortBy sozinho como filtro de cirurgia real', async () => {
      buscarPacientesQuery.execute.mockResolvedValue([{ nome: 'X', cpf: '1', cirurgias: [] }]);

      await useCase.execute({ filtrosPaciente: { convenio: 'ConvenioX' }, filtrosCirurgia: { sortBy: 'data_desc' } });

      expect(buscarCirurgiasQuery.execute).not.toHaveBeenCalled();
      expect(buscarPacientesQuery.execute).toHaveBeenCalledWith({ convenio: 'ConvenioX', q: '' });
    });
  });

  describe('os dois filtros ativos', () => {
    it('interseca por CPF, mantendo so as cirurgias que passaram no filtro de cirurgia', async () => {
      buscarPacientesQuery.execute.mockResolvedValue([
        { nome: 'Carlos', cpf: '444', convenio: 'ConvenioX', fornecedor: ['FornecedorA'], dataRnm: null, ultimosFornecedores: [], cirurgias: [] },
        { nome: 'Beatriz', cpf: '555', convenio: 'ConvenioX', fornecedor: ['FornecedorD'], dataRnm: null, ultimosFornecedores: [], cirurgias: [] },
      ]);
      buscarCirurgiasQuery.execute.mockResolvedValue([
        { pacienteCpf: '444', status: 'Realizado', data: new Date() },
        { pacienteCpf: '999', status: 'Realizado', data: new Date() }, // paciente que nao bateu no filtro de paciente
      ]);

      const linhas = await useCase.execute({
        filtrosPaciente: { convenio: 'ConvenioX' },
        filtrosCirurgia: { status: 'Realizado' },
      });

      expect(linhas).toHaveLength(1);
      expect(linhas[0].cpf).toBe('444');
      expect(linhas[0].cirurgias).toHaveLength(1);
    });
  });
});
