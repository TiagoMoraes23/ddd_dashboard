const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const EventBus = require('./EventBus');
const AuditoriaSubscriber = require('./AuditoriaSubscriber');
const AuditoriaModel = require('../database/mongoose/AuditoriaSchema');

jest.setTimeout(60000);

describe('Subscriber: AuditoriaSubscriber', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await AuditoriaModel.deleteMany({});
    jest.restoreAllMocks();
  });

  it('registra o listener no evento AcaoAuditavel ao chamar setup()', () => {
    const subscribeSpy = jest.spyOn(EventBus, 'subscribe');

    AuditoriaSubscriber.setup();

    expect(subscribeSpy).toHaveBeenCalledWith('AcaoAuditavel', expect.any(Function));
  });

  it('persiste um registro na coleção auditoria com os dados do payload', async () => {
    let callbackRegistrado;
    jest.spyOn(EventBus, 'subscribe').mockImplementation((_evento, callback) => {
      callbackRegistrado = callback;
    });

    AuditoriaSubscriber.setup();

    await callbackRegistrado({
      usuarioId: 'user-1',
      usuarioUsername: 'tester',
      acao: 'criar',
      recurso: 'cirurgia',
      recursoId: 'cirurgia-1',
    });

    const registros = await AuditoriaModel.find({});
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      usuarioId: 'user-1',
      usuarioUsername: 'tester',
      acao: 'criar',
      recurso: 'cirurgia',
      recursoId: 'cirurgia-1',
    });
    expect(registros[0].criadoEm).toBeInstanceOf(Date);
  });

  it('não propaga erro se a gravação da auditoria falhar (não pode derrubar a ação já concluída)', async () => {
    let callbackRegistrado;
    jest.spyOn(EventBus, 'subscribe').mockImplementation((_evento, callback) => {
      callbackRegistrado = callback;
    });
    jest.spyOn(AuditoriaModel, 'create').mockRejectedValueOnce(new Error('falha simulada de escrita'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    AuditoriaSubscriber.setup();

    await expect(callbackRegistrado({ acao: 'criar', recurso: 'cirurgia' })).resolves.not.toThrow();
  });
});
