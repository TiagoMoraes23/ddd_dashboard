const Cirurgia = require('./Cirurgia');
const StatusCirurgia = require('./valueObjects/StatusCirurgia');
const { faker } = require('@faker-js/faker');

describe('Domain Entity: Cirurgia', () => {
  describe('Criação da Entidade', () => {
    it('deve criar uma cirurgia com sucesso com os dados mínimos e status padrão', () => {
      const cirurgiaData = {
        id: faker.string.uuid(),
        pacienteId: faker.string.uuid(),
      };

      const cirurgia = new Cirurgia(cirurgiaData);

      expect(cirurgia.id).toBe(cirurgiaData.id);
      expect(cirurgia.pacienteId).toBe(cirurgiaData.pacienteId);
      expect(cirurgia.status).toBeInstanceOf(StatusCirurgia);
      expect(cirurgia.status.getValue()).toBe('Agendamento Pendente');
      expect(cirurgia.regiao).toEqual([]); // uma cirurgia pode tratar mais de uma articulação
    });

    it('deve aceitar mais de uma região (articulação) para a mesma cirurgia', () => {
      const cirurgia = new Cirurgia({
        id: faker.string.uuid(),
        pacienteId: faker.string.uuid(),
        regiao: ['Ombro', 'Cotovelo'],
      });

      expect(cirurgia.regiao).toEqual(['Ombro', 'Cotovelo']);
    });

    it('deve criar uma cirurgia com um status específico fornecido', () => {
        const cirurgiaData = {
          id: faker.string.uuid(),
          pacienteId: faker.string.uuid(),
          status: 'Autorizado',
        };
  
        const cirurgia = new Cirurgia(cirurgiaData);
        expect(cirurgia.status.getValue()).toBe('Autorizado');
      });

    it('deve lançar erro se o ID não for fornecido', () => {
      expect(() => {
        new Cirurgia({ pacienteId: faker.string.uuid() });
      }).toThrow('ID é obrigatório para instanciar uma Cirurgia.');
    });

    it('deve lançar erro se o pacienteId não for fornecido', () => {
      expect(() => {
        new Cirurgia({ id: faker.string.uuid() });
      }).toThrow('O ID do paciente (pacienteId) é obrigatório.');
    });
  });

  describe('Regra de Negócio: agendar()', () => {
    let cirurgia;

    beforeEach(() => {
      cirurgia = new Cirurgia({
        id: faker.string.uuid(),
        pacienteId: faker.string.uuid(),
      });
    });

    it('deve agendar a cirurgia, atualizando data, horário e status', () => {
      const novaData = faker.date.future();
      const novoHorario = '14:30';

      expect(cirurgia.status.getValue()).toBe('Agendamento Pendente'); // Status inicial

      cirurgia.agendar(novaData, novoHorario);

      expect(cirurgia.data).toEqual(novaData);
      expect(cirurgia.horario).toBe(novoHorario);
      expect(cirurgia.status.getValue()).toBe('Agendado');
    });

    it('deve lançar um erro ao tentar agendar sem fornecer a data ou o horário', () => {
      expect(() => cirurgia.agendar(null, '10:00')).toThrow('Data e horário são obrigatórios para agendar a cirurgia.');
      expect(() => cirurgia.agendar(new Date(), null)).toThrow('Data e horário são obrigatórios para agendar a cirurgia.');
    });
  });

  describe('Regra de Negócio: atualizarStatus()', () => {
    it('deve atualizar o status para um valor válido', () => {
      const cirurgia = new Cirurgia({ id: faker.string.uuid(), pacienteId: faker.string.uuid() });

      cirurgia.atualizarStatus('Realizado');

      expect(cirurgia.status).toBeInstanceOf(StatusCirurgia);
      expect(cirurgia.status.getValue()).toBe('Realizado');
    });

    it('deve propagar o erro do Value Object ao tentar um status inválido', () => {
      const cirurgia = new Cirurgia({ id: faker.string.uuid(), pacienteId: faker.string.uuid() });

      expect(() => cirurgia.atualizarStatus('status-que-nao-existe')).toThrow();
    });
  });

  describe('Regra de Negócio: atualizarDados()', () => {
    it('deve atualizar apenas os campos explicitamente informados', () => {
      const cirurgia = new Cirurgia({
        id: faker.string.uuid(),
        pacienteId: faker.string.uuid(),
        descricao: 'Original',
        hospital: 'Hospital A',
      });

      cirurgia.atualizarDados({ descricao: 'Nova descrição', regiao: ['Joelho'] });

      expect(cirurgia.descricao).toBe('Nova descrição');
      expect(cirurgia.regiao).toEqual(['Joelho']);
      expect(cirurgia.hospital).toBe('Hospital A'); // não informado, permanece igual
    });

    it('deve propagar o erro do Value Object ao atualizar para um status inválido', () => {
      const cirurgia = new Cirurgia({ id: faker.string.uuid(), pacienteId: faker.string.uuid() });

      expect(() => cirurgia.atualizarDados({ status: 'status-que-nao-existe' })).toThrow();
    });
  });
});