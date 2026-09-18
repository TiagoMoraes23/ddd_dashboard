/**
 * Monta os dados (uma linha por paciente, cirurgias agrupadas) para a
 * exportação de planilha, replicando os 3 ramos de combinação de filtros já
 * usados pela tela de busca (App.jsx's buscarCombinado) — não uma query nova,
 * as mesmas duas: BuscarPacientesQuery (filtros de paciente) e
 * BuscarCirurgiasQuery (filtros de cirurgia). Isso garante que a planilha
 * reflita exatamente o que a busca em tela mostrou, sem duplicar a lógica de
 * filtro/interseção por CPF num terceiro lugar.
 */
class ExportarCirurgiasUseCase {
  constructor(buscarPacientesQuery, buscarCirurgiasQuery) {
    if (!buscarPacientesQuery || typeof buscarPacientesQuery.execute !== 'function') {
      throw new Error('A dependência buscarPacientesQuery (com o método execute) é obrigatória.');
    }
    if (!buscarCirurgiasQuery || typeof buscarCirurgiasQuery.execute !== 'function') {
      throw new Error('A dependência buscarCirurgiasQuery (com o método execute) é obrigatória.');
    }
    this.buscarPacientesQuery = buscarPacientesQuery;
    this.buscarCirurgiasQuery = buscarCirurgiasQuery;
  }

  async execute({ filtrosPaciente = {}, filtrosCirurgia = {}, q = '' } = {}) {
    // `sortBy` sempre vem preenchido pelo FiltrosBuscaPanel (valor padrão
    // 'data_desc'), mesmo quando só há filtro de paciente — não conta como
    // "filtro de cirurgia" real, mesmo critério usado em App.jsx.
    const temFiltroCirurgia = Object.keys(filtrosCirurgia).some((chave) => chave !== 'sortBy');
    const temFiltroPaciente = Object.keys(filtrosPaciente).length > 0;

    if (temFiltroPaciente && temFiltroCirurgia) {
      const [pacientes, cirurgias] = await Promise.all([
        this.buscarPacientesQuery.execute({ ...filtrosPaciente, q }),
        this.buscarCirurgiasQuery.execute({ ...filtrosCirurgia, q }),
      ]);
      return this.#linhasComOsDoisFiltros(pacientes, cirurgias);
    }

    if (temFiltroPaciente) {
      const pacientes = await this.buscarPacientesQuery.execute({ ...filtrosPaciente, q });
      return pacientes.map((p) => this.#linhaDePaciente(p, p.cirurgias || []));
    }

    // Só filtro de cirurgia, ou nenhum filtro (busca livre/tudo) — mesmo
    // ramo "else" de App.jsx's buscarCombinado.
    const cirurgias = await this.buscarCirurgiasQuery.execute({ ...filtrosCirurgia, q });
    return this.#linhasApartirDeCirurgiasAchatadas(cirurgias);
  }

  // Ramo "os dois filtros ativos": o paciente completo (com todos os campos
  // de nível-paciente já em mãos) é a base da linha, mas só entram as
  // cirurgias que TAMBÉM passaram no filtro de cirurgia — mesma interseção
  // por CPF que a tela já faz. Paciente sem nenhuma cirurgia sobrevivendo à
  // interseção não gera linha (idêntico ao que a tela mostraria).
  #linhasComOsDoisFiltros(pacientes, cirurgiasFiltradas) {
    const cirurgiasPorCpf = new Map();
    cirurgiasFiltradas.forEach((c) => {
      if (!cirurgiasPorCpf.has(c.pacienteCpf)) cirurgiasPorCpf.set(c.pacienteCpf, []);
      cirurgiasPorCpf.get(c.pacienteCpf).push(c);
    });

    return pacientes
      .filter((p) => cirurgiasPorCpf.has(p.cpf))
      .map((p) => this.#linhaDePaciente(p, cirurgiasPorCpf.get(p.cpf)));
  }

  // Ramo "só filtro de cirurgia" (ou nenhum filtro): as linhas achatadas de
  // BuscarCirurgiasQuery já trazem os campos de nível-paciente
  // (pacienteDataRnm/pacienteUltimosFornecedores incluídos especificamente
  // para esta exportação) — agrupa por CPF.
  #linhasApartirDeCirurgiasAchatadas(cirurgiasAchatadas) {
    const grupos = new Map();
    cirurgiasAchatadas.forEach((c) => {
      if (!grupos.has(c.pacienteCpf)) {
        grupos.set(c.pacienteCpf, {
          nome: c.pacienteNome,
          cpf: c.pacienteCpf,
          convenio: c.pacienteConvenio,
          fornecedorAtual: c.pacienteFornecedor,
          dataRnm: c.pacienteDataRnm,
          ultimosFornecedores: c.pacienteUltimosFornecedores || [],
          cirurgias: [],
        });
      }
      grupos.get(c.pacienteCpf).cirurgias.push(this.#cirurgiaParaLinha(c));
    });
    return Array.from(grupos.values());
  }

  #linhaDePaciente(paciente, cirurgias) {
    return {
      nome: paciente.nome,
      cpf: paciente.cpf,
      convenio: paciente.convenio,
      fornecedorAtual: paciente.fornecedor || [],
      dataRnm: paciente.dataRnm,
      ultimosFornecedores: paciente.ultimosFornecedores || [],
      cirurgias: cirurgias.map((c) => this.#cirurgiaParaLinha(c)),
    };
  }

  #cirurgiaParaLinha(c) {
    return {
      status: c.status,
      data: c.data,
      horario: c.horario,
      opme: c.opme,
      fornecedor: c.fornecedor,
      hospital: c.hospital,
      descricao: c.descricao,
      regiao: c.regiao,
    };
  }
}

module.exports = ExportarCirurgiasUseCase;
