const { v4: uuidv4 } = require('uuid');
const Cirurgia = require('../../domain/Cirurgia');
const EventBus = require('../../../../shared/infra/events/EventBus');
const CirurgiaAgendadaEvent = require('../../domain/events/CirurgiaAgendadaEvent');

class AgendarCirurgiaUseCase {
  constructor(cirurgiaRepository, verificadorConflito) {
    if (!cirurgiaRepository || !verificadorConflito) {
      throw new Error('As dependências cirurgiaRepository e verificadorConflito são obrigatórias.');
    }
    this.cirurgiaRepository = cirurgiaRepository;
    this.verificadorConflito = verificadorConflito;
  }

  /**
   * Uma cirurgia pode existir em estágios anteriores ao agendamento (ex.:
   * 'Autorizado', 'Agendamento Pendente') sem data/horário definidos ainda —
   * por isso esses campos são opcionais aqui. A verificação de conflito de
   * horário só faz sentido, e só roda, quando os dois estão presentes.
   */
  async execute(dadosCirurgia, autor) {
    const { data, horario } = dadosCirurgia;

    if (data && horario) {
      await this.verificadorConflito.verificarConflito(data, horario);
    }

    const cirurgia = new Cirurgia({
      id: uuidv4(),
      ...dadosCirurgia,
    });

    const cirurgiaSalva = await this.cirurgiaRepository.salvar(cirurgia);

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