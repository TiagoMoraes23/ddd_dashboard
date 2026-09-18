const Paciente = require('./Paciente');
const Cpf = require('./valueObjects/Cpf');
const { faker } = require('@faker-js/faker');

// Função auxiliar para gerar um CPF válido para os testes
function gerarCpfValidoString() {
  return '52998224725'; // Usando o mesmo stub do teste de Value Object
}

describe('Domain Entity: Paciente', () => {
  let validCpf;

  beforeEach(() => {
    validCpf = new Cpf(gerarCpfValidoString());
  });

  describe('Criação da Entidade', () => {
    it('deve criar um paciente com sucesso quando dados válidos forem fornecidos', () => {
      const pacienteData = {
        id: faker.string.uuid(),
        nome: faker.person.fullName(),
        cpf: validCpf,
        convenio: 'Unimed',
        dataRnm: faker.date.recent(),
      };

      const paciente = new Paciente(pacienteData);

      expect(paciente.id).toBe(pacienteData.id);
      expect(paciente.nome).toBe(pacienteData.nome);
      expect(paciente.cpf).toBeInstanceOf(Cpf);
      expect(paciente.convenio).toBe('Unimed');
      expect(paciente.dataRnm).toBeInstanceOf(Date);
    });

    it('deve lançar erro se o ID não for fornecido', () => {
      expect(() => {
        new Paciente({ nome: 'João', cpf: validCpf });
      }).toThrow('ID é obrigatório para instanciar um Paciente.');
    });

    it('deve lançar erro se o nome não for fornecido', () => {
      expect(() => {
        new Paciente({ id: '1', cpf: validCpf });
      }).toThrow('Nome é obrigatório.');
    });

    it('deve lançar erro se o CPF não for uma instância do Value Object Cpf', () => {
      expect(() => {
        new Paciente({ id: '123', nome: 'João', cpf: '12345678901' });
      }).toThrow('O CPF deve ser uma instância do Value Object Cpf.');
    });
  });

  describe('Regra de Negócio: isRnmVencida', () => {
    it('deve retornar true se o paciente não tiver dataRnm cadastrada', () => {
      const paciente = new Paciente({
        id: faker.string.uuid(),
        nome: faker.person.fullName(),
        cpf: validCpf,
      });

      expect(paciente.isRnmVencida()).toBe(true);
    });

    it('deve retornar false se a dataRnm foi realizada há menos de 12 meses', () => {
      // RNM feita há 10 meses
      const dataRecente = new Date();
      dataRecente.setMonth(dataRecente.getMonth() - 10);

      const paciente = new Paciente({ id: '1', nome: 'Maria', cpf: validCpf, dataRnm: dataRecente });
      expect(paciente.isRnmVencida()).toBe(false);
    });

    it('deve retornar true se a dataRnm foi realizada há mais de 12 meses', () => {
      // RNM feita há 13 meses
      const dataAntiga = new Date();
      dataAntiga.setMonth(dataAntiga.getMonth() - 13);

      const paciente = new Paciente({ id: '1', nome: 'José', cpf: validCpf, dataRnm: dataAntiga });
      expect(paciente.isRnmVencida()).toBe(true);
    });
  });

  describe('Regra de Negócio: atualizarDados', () => {
    it('deve atualizar todos os campos quando todos forem fornecidos', () => {
      const paciente = new Paciente({ id: '1', nome: 'Original', cpf: validCpf });
      const novaData = faker.date.recent();

      paciente.atualizarDados({
        nome: 'Atualizado',
        convenio: 'ConvenioX',
        observacoes: 'Nota nova',
        dataRnm: novaData,
        contato: '8888-1111',
        linkArquivos: 'http://exemplo.com/arquivo',
        fornecedor: 'Fornecedor X',
        ultimosFornecedores: ['Fornecedor X'],
      });

      expect(paciente.nome).toBe('Atualizado');
      expect(paciente.convenio).toBe('ConvenioX');
      expect(paciente.observacoes).toBe('Nota nova');
      expect(paciente.dataRnm).toEqual(new Date(novaData));
      expect(paciente.contato).toBe('8888-1111');
      expect(paciente.linkArquivos).toBe('http://exemplo.com/arquivo');
      expect(paciente.fornecedor).toBe('Fornecedor X');
      expect(paciente.ultimosFornecedores).toEqual(['Fornecedor X']);
    });

    it('deve limpar a dataRnm quando null for informado explicitamente (diferente de não informar)', () => {
      const paciente = new Paciente({ id: '1', nome: 'Original', cpf: validCpf, dataRnm: faker.date.recent() });

      paciente.atualizarDados({ dataRnm: null });

      expect(paciente.dataRnm).toBeNull();
    });

    it('não deve alterar nenhum campo quando nenhum for informado (undefined != apagar)', () => {
      const paciente = new Paciente({
        id: '1',
        nome: 'Original',
        cpf: validCpf,
        convenio: 'Unimed',
        observacoes: 'Nota importante',
        dataRnm: faker.date.recent(),
        contato: '9999-0000',
        linkArquivos: 'http://original.com',
        fornecedor: 'Fornecedor Original',
        ultimosFornecedores: ['Fornecedor Original'],
      });
      const estadoOriginal = { ...paciente };

      paciente.atualizarDados({});

      expect(paciente).toEqual(estadoOriginal);
    });
  });

  describe('Regra de Negócio: inativar', () => {
    it('deve marcar o paciente como inativo', () => {
      const paciente = new Paciente({ id: '1', nome: 'Ativo', cpf: validCpf });

      paciente.inativar();

      expect(paciente.ativo).toBe(false);
    });

    it('deve lançar erro ao tentar inativar um paciente já inativo', () => {
      const paciente = new Paciente({ id: '1', nome: 'Ativo', cpf: validCpf, ativo: false });

      expect(() => paciente.inativar()).toThrow('O paciente já se encontra inativo.');
    });
  });
});