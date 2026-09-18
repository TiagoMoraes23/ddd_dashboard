const { v4: uuidv4 } = require('uuid');
const Cirurgia = require('../../domain/Cirurgia');
const EventBus = require('../../../../shared/infra/events/EventBus');
const CirurgiaAgendadaEvent = require('../../domain/events/CirurgiaAgendadaEvent');

class AgendarCirurgiaUseCase {
  /**
   * @param {object} cirurgiaRepository - Repositório para persistência de cirurgias.
   * @param {object} verificadorConflito - Serviço de domínio para verificar conflitos de horário.
   */
  constructor(cirurgiaRepository, verificadorConflito) {
    if (!cirurgiaRepository || !verificadorConflito) {
      throw new Error('As dependências cirurgiaRepository e verificadorConflito são obrigatórias.');
    }
    this.cirurgiaRepository = cirurgiaRepository;
    this.verificadorConflito = verificadorConflito;
  }

  /**
   * Executa o caso de uso de criação de cirurgia.
   *
   * Uma cirurgia pode existir em estágios anteriores ao agendamento (ex.:
   * 'Autorizado', 'Agendamento Pendente') sem data/horário definidos ainda —
   * por isso esses campos são opcionais aqui. A verificação de conflito de
   * horário só faz sentido, e só roda, quando os dois estão presentes.
   * @param {object} dadosCirurgia
   * @param {string} dadosCirurgia.pacienteId
   * @param {Date} [dadosCirurgia.data]
   * @param {string} [dadosCirurgia.horario]
   * @param {string} [dadosCirurgia.status]
   * @param {string} [dadosCirurgia.descricao]
   * @param {object} [autor] - Usuário autenticado que disparou a ação (para auditoria).
   * @param {string} [autor.id]
   * @param {string} [autor.username]
   * @returns {Promise<Cirurgia>} A entidade de cirurgia criada e salva.
   */
  async execute(dadosCirurgia, autor) {
    const { data, horario } = dadosCirurgia;

    // Passo 1: Chamar o Domain Service para verificar regras que cruzam agregados,
    // mas só quando há de fato um agendamento (data + horário) para conferir.
    if (data && horario) {
      await this.verificadorConflito.verificarConflito(data, horario);
    }

    // Passo 2: Instanciar a entidade. O status vem do chamador (default do
    // domínio é 'Agendamento Pendente' se nada for informado).
    const cirurgia = new Cirurgia({
      id: uuidv4(),
      ...dadosCirurgia,
    });

    // Passo 3: Persistir a entidade através do repositório.
    const cirurgiaSalva = await this.cirurgiaRepository.salvar(cirurgia);

    // Passo 4: Publicar o evento de domínio para desacoplar módulos.
    // Usa a entidade `cirurgia` (não `cirurgiaSalva`, que é o documento cru
    // retornado pelo repositório — `status` ali já é string, não o VO).
    const evento = new CirurgiaAgendadaEvent({
      id: cirurgia.id,
      pacienteId: cirurgia.pacienteId,
      data: cirurgia.data,
      horario: cirurgia.horario,
      status: cirurgia.status.getValue(),
    });
    EventBus.publish(CirurgiaAgendadaEvent.name, evento.payload);

    // Passo 5: Publicar o evento de auditoria (registro de quem fez o quê),
    // separado do evento de domínio acima — só roda quando há um autor
    // conhecido (chamada via HTTP autenticada).
    if (autor) {
      EventBus.publish('AcaoAuditavel', {
        usuarioId: autor.id,
        usuarioUsername: autor.username,
        acao: 'criar',
        recurso: 'cirurgia',
        recursoId: cirurgia.id,
      });
    }

    return cirurgiaSalva;
  }
}

module.exports = AgendarCirurgiaUseCase;