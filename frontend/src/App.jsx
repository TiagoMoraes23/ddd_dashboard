import { useState, useEffect, useCallback, useRef } from "react";

import api, { setUnauthorizedHandler } from "./api/client.js";
import PacienteCard from "./components/PacienteCard.jsx";
import SearchBar from "./components/SearchBar.jsx";
import PacienteForm from "./components/PacienteForm.jsx";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import FiltrosBuscaPanel from "./components/FiltrosBuscaPanel.jsx";
import SurgeryResultsTable from "./components/SurgeryResultsTable.jsx";
import Modal from "./components/Modal.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import UserManagement from "./components/UserManagement.jsx";

// Fornecedor atual/convênio são campos do paciente; a busca de cirurgias
// (/cirurgias/buscar) trabalha com linhas por cirurgia. Quando só o filtro de
// pacientes está ativo, adapta cada paciente para o mesmo formato de linha da
// tabela de busca (mantendo contagem/ranking/exportar da SurgeryResultsTable),
// incluindo pacientes sem nenhuma cirurgia. A coluna "Fornecedor Cirurgia" e a
// "Data" ficam em branco: a cirurgia mais recente pode ter usado um fornecedor
// diferente do fornecedor ATUAL que qualificou a busca, e mostrá-la pareceria
// um resultado incorreto sem relação com o filtro aplicado.
function pacienteParaLinhaDeCirurgia(paciente) {
    const ultimaCirurgia = [...(paciente.cirurgias || [])].sort((a, b) => {
        const dateA = a.data ? new Date(a.data).getTime() : 0;
        const dateB = b.data ? new Date(b.data).getTime() : 0;
        return dateB - dateA;
    })[0];
    return {
        _id: paciente.cpf,
        pacienteNome: paciente.nome,
        pacienteCpf: paciente.cpf,
        pacienteConvenio: paciente.convenio,
        pacienteFornecedor: Array.isArray(paciente.fornecedor) ? paciente.fornecedor.join(', ') : paciente.fornecedor,
        status: ultimaCirurgia?.status,
    };
}

export default function App() {
    const [userInfo, setUserInfo] = useState(() => {
        try {
            const stored = localStorage.getItem('userInfo');
            return stored ? JSON.parse(stored) : null;
        } catch (err) {
            localStorage.removeItem('userInfo');
            return null;
        }
    });
    const [loginError, setLoginError] = useState(null);

    const [view, setView] = useState('mainDashboard');
    const [pacientes, setPacientes] = useState([]);
    const [cirurgiasEncontradas, setCirurgiasEncontradas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState(null);
    const [filtrosCirurgia, setFiltrosCirurgia] = useState({});
    const [filtrosPaciente, setFiltrosPaciente] = useState({});
    const [dashboardStats, setDashboardStats] = useState(null);
    const [isDashboardLoading, setIsDashboardLoading] = useState(true);

    const [valorInputBusca, setValorInputBusca] = useState("");
    const [pacienteEmEdicao, setPacienteEmEdicao] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [pacienteEmVisualizacao, setPacienteEmVisualizacao] = useState(null);

    // Debounce da barra de busca: evita disparar uma requisição a cada tecla.
    const searchDebounceRef = useRef(null);
    // Com o servidor na nuvem, respostas de buscas concorrentes podem chegar
    // fora de ordem sob latência variável — só a busca mais recente pode
    // aplicar seu resultado, para nunca mostrar dados de uma busca antiga.
    const searchSeqRef = useRef(0);

    useEffect(() => {
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, []);

    const handleLogout = useCallback(() => {
        // O cookie httpOnly não pode ser apagado por JavaScript — só o backend
        // consegue, via Set-Cookie na resposta. Dispara e não espera: o logout
        // local (abaixo) não deve travar esperando essa chamada.
        api.post('/api/v2/auth/logout').catch(() => {});
        localStorage.removeItem('userInfo');
        setUserInfo(null);
        setView('mainDashboard');
    }, []);

    // Registra uma única vez: quando qualquer requisição do client único
    // (frontend/src/api/client.js) voltar 401 (token expirado/inválido), força
    // o logout em vez de deixar a tela presa num estado autenticado quebrado.
    useEffect(() => {
        setUnauthorizedHandler(handleLogout);
    }, [handleLogout]);

    // Ping leve a cada 10 minutos: mantém a sessão validada e evita o servidor
    // (hospedagens gratuitas costumam hibernar após um período de inatividade)
    // — mesma mecânica do legado, agora sem precisar tratar 401 manualmente
    // aqui (o interceptor global de api/client.js já dispara handleLogout).
    useEffect(() => {
        if (!userInfo) return;
        const intervalId = setInterval(() => {
            api.get('/api/v2/ping')
                .then(() => console.log('ping pong ok!'))
                .catch(() => {});
        }, 10 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [userInfo]);

    const handleLogin = async ({ username, password }) => {
        try {
            const { data } = await api.post('/api/v2/auth/login', { username, password });
            // O backend retorna { usuario: {id, username, role} } — o token vai
            // só no cookie httpOnly (Set-Cookie), nunca no corpo/localStorage.
            // userInfo aqui é só pra UI (nome/role exibidos), não é credencial.
            localStorage.setItem('userInfo', JSON.stringify(data.usuario));
            setUserInfo(data.usuario);
            setLoginError(null);
        } catch (err) {
            const message = err.response?.data?.message || 'Erro ao tentar fazer login.';
            setLoginError(message);
            throw new Error(message);
        }
    };

    const carregarPacientes = useCallback(async (params) => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/api/v2/pacientes', { params });
            setPacientes(data.pacientes || data || []); 
        } catch (err) {
            setError("Não foi possível carregar os pacientes.");
        } finally {
            setIsLoading(false); 
        }
    }, [api]);

    const carregarDashboardStats = useCallback(async () => {
        setIsDashboardLoading(true);
        try {
            const { data } = await api.get('/api/v2/dashboard/stats');
            setDashboardStats(data);
        } catch (err) {
            console.error("Dashboard Stats Error:", err);
        } finally {
            setIsDashboardLoading(false);
        }
    }, [api]);

    useEffect(() => {
        if (userInfo) carregarPacientes({});
    }, [userInfo, carregarPacientes]);

    useEffect(() => {
        if (userInfo && view === 'mainDashboard') carregarDashboardStats();
    }, [userInfo, view, carregarDashboardStats]);

    // Fornecedor de cirurgia/status e fornecedor atual/convênio (os dois grupos
    // de campo do FiltrosBuscaPanel) vivem em endpoints diferentes — nenhum dos
    // dois agregados conhece os campos do outro. Quando só um dos dois grupos
    // tem filtro ativo, usa o endpoint correspondente direto; quando os dois
    // têm, busca nos dois em paralelo e combina por interseção de CPF no
    // cliente, sem precisar ensinar um agregado a enxergar campos do outro.
    const buscarCombinado = useCallback(async (overrides = {}) => {
        const seq = ++searchSeqRef.current;
        const filtrosCirurgiaAtual = overrides.filtrosCirurgia ?? filtrosCirurgia;
        const filtrosPacienteAtual = overrides.filtrosPaciente ?? filtrosPaciente;
        const q = overrides.q !== undefined ? overrides.q : valorInputBusca;

        // `sortBy` sempre vem preenchido pelo FiltrosBuscaPanel (tem valor padrão
        // 'data_desc'), mesmo quando o usuário só preencheu campos do paciente —
        // por isso não conta como "filtro de cirurgia" real para decidir o
        // branch abaixo, senão toda busca cairia no caminho "os dois filtros
        // ativos" e listaria uma linha por cirurgia (duplicando o nome do
        // paciente) mesmo sem nenhum parâmetro de cirurgia preenchido.
        const temFiltroCirurgia = Object.keys(filtrosCirurgiaAtual).some((chave) => chave !== 'sortBy');
        // `forcarTodosPacientes` cobre o botão "Ver Todos Pacientes": sem essa
        // flag, filtros vazios cairiam no branch "else" (busca de CIRURGIAS),
        // que retorna uma linha por cirurgia — um paciente com várias cirurgias
        // aparece várias vezes, inflando "N resultados" e fazendo o usuário
        // achar que está vendo a contagem real de pacientes quando não está.
        const temFiltroPaciente = overrides.forcarTodosPacientes || Object.keys(filtrosPacienteAtual).length > 0;

        setIsLoading(true);
        try {
            let resultado;
            if (temFiltroPaciente && temFiltroCirurgia) {
                // Os dois filtros têm autonomia (cada um consulta seu próprio
                // endpoint com seus próprios parâmetros), mas o resultado final
                // combina os dois: mantém as cirurgias que baterem no filtro de
                // cirurgias E cujo paciente também bata no filtro de pacientes.
                const [respPacientes, respCirurgias] = await Promise.all([
                    api.get('/api/v2/pacientes', { params: { ...filtrosPacienteAtual, q } }),
                    api.get('/api/v2/cirurgias/buscar', { params: { ...filtrosCirurgiaAtual, q } }),
                ]);
                const pacientesResultado = respPacientes.data.pacientes || respPacientes.data || [];
                const cpfsPacientes = new Set(pacientesResultado.map((p) => p.cpf));
                resultado = respCirurgias.data.filter((c) => cpfsPacientes.has(c.pacienteCpf));
            } else if (temFiltroPaciente) {
                // Só o filtro de pacientes: resultado é estritamente por
                // fornecedor atual/convênio, com ou sem cirurgia registrada.
                const { data } = await api.get('/api/v2/pacientes', { params: { ...filtrosPacienteAtual, q } });
                const resultados = data.pacientes || data || [];
                resultado = resultados.map(pacienteParaLinhaDeCirurgia);
            } else {
                const { data } = await api.get('/api/v2/cirurgias/buscar', { params: { ...filtrosCirurgiaAtual, q } });
                resultado = data;
            }

            // Descarta a resposta se uma busca mais nova já foi disparada
            // enquanto esta ainda estava em andamento.
            if (seq === searchSeqRef.current) {
                setCirurgiasEncontradas(resultado);
            }
        } catch (err) {
            if (seq === searchSeqRef.current) {
                setError("Não foi possível buscar as cirurgias.");
            }
        } finally {
            if (seq === searchSeqRef.current) {
                setIsLoading(false);
            }
        }
    }, [api, filtrosCirurgia, filtrosPaciente, valorInputBusca]);

    // Um só botão de buscar/limpar para os dois grupos de filtro (paciente +
    // cirurgia) — antes eram dois painéis com botões separados, e o usuário
    // precisava clicar nos dois pra combinar os parâmetros na mesma busca.
    function handleBuscarFiltros({ filtrosPaciente: fp, filtrosCirurgia: fc }) {
        setFiltrosPaciente(fp);
        setFiltrosCirurgia(fc);
        buscarCombinado({ filtrosPaciente: fp, filtrosCirurgia: fc });
    }

    function limparFiltros() {
        setFiltrosPaciente({});
        setFiltrosCirurgia({});
        if (valorInputBusca) {
            buscarCombinado({ filtrosPaciente: {}, filtrosCirurgia: {} });
        } else {
            setCirurgiasEncontradas([]);
        }
    }

    // Só dispara a busca 700ms depois que o usuário parar de digitar — evita
    // uma requisição por letra, importante com o servidor na nuvem (latência
    // faria as respostas se acumularem/chegarem fora de ordem).
    function handleSearchInputChange(term) {
        setValorInputBusca(term);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            buscarCombinado({ q: term });
        }, 700);
    }

    function handleSearchClear() {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        setValorInputBusca('');
        buscarCombinado({ q: '' });
    }

    // Nome corrigido (era handleViewAllSurgeries): o botão diz "Ver Todos
    // Pacientes" e é isso que precisa mostrar — antes caía no branch de busca
    // de CIRURGIAS (uma linha por cirurgia), inflando a contagem de resultados.
    function handleVerTodosPacientes() {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        setView('dashboard');
        setValorInputBusca('');
        setFiltrosCirurgia({});
        setFiltrosPaciente({});
        buscarCombinado({ filtrosCirurgia: {}, filtrosPaciente: {}, q: '', forcarTodosPacientes: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Exporta exatamente o resultado da busca atual em tela (mesmos
    // filtrosPaciente/filtrosCirurgia/q já usados por buscarCombinado) — o
    // backend replica a mesma lógica de 3 ramos/interseção por CPF, uma linha
    // por paciente com as cirurgias agrupadas na mesma célula.
    async function handleExport() {
        setIsExporting(true);
        try {
            const resposta = await api.get('/api/v2/relatorios/cirurgias/exportar', {
                params: {
                    filtrosPaciente: JSON.stringify(filtrosPaciente),
                    filtrosCirurgia: JSON.stringify(filtrosCirurgia),
                    q: valorInputBusca,
                },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(new Blob([resposta.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'relatorio_cirurgias.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            // Com responseType: 'blob', até uma resposta de erro JSON do backend
            // chega como Blob — precisa ser lida como texto antes de extrair a
            // mensagem, senão err.response.data.message é sempre undefined.
            let mensagem = "Falha ao exportar a planilha.";
            const dadosErro = err.response?.data;
            if (dadosErro instanceof Blob) {
                try {
                    const texto = await dadosErro.text();
                    mensagem = JSON.parse(texto)?.message || mensagem;
                } catch (parseErr) {
                    // corpo do erro não era JSON — mantém a mensagem genérica
                }
            } else {
                mensagem = dadosErro?.message || mensagem;
            }
            setError(mensagem);
        } finally {
            setIsExporting(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm("Tem certeza que deseja apagar este paciente?")) return;
        setIsLoading(true);
        try {
            await api.delete(`/api/v2/pacientes/${id}`);
            await carregarPacientes({});
        } catch (err) {
            setError(err.response?.data?.message || "Falha ao apagar o paciente.");
        } finally {
            setIsLoading(false);
        }
    }

    // As queries do dashboard/busca já retornam o documento completo do
    // paciente (ver ADR 002), então na maioria dos casos já temos tudo em
    // mãos. A busca avançada de cirurgias é a exceção: cada linha ali é uma
    // cirurgia (só tem o CPF do paciente), então precisamos buscar o
    // paciente completo por CPF nesse caso — inclusive para editar, já que
    // o formulário sobrescreve todos os campos do paciente no PUT e um
    // objeto parcial (só cpf) apagaria o restante dos dados dele.
    async function buscarPacienteCompleto(cpfOuPaciente) {
        if (cpfOuPaciente && typeof cpfOuPaciente === 'object') {
            return cpfOuPaciente;
        }

        const cpf = cpfOuPaciente;
        const jaCarregado = pacientes.find((p) => p.cpf === cpf);
        if (jaCarregado) return jaCarregado;

        const { data } = await api.get('/api/v2/pacientes', { params: { q: cpf } });
        const resultados = data.pacientes || data || [];
        return resultados.find((p) => p.cpf === cpf) || null;
    }

    async function handleViewDetails(cpfOuPaciente) {
        try {
            const paciente = await buscarPacienteCompleto(cpfOuPaciente);
            if (paciente) {
                setPacienteEmVisualizacao(paciente);
                setIsModalVisible(true);
            } else {
                setError("Não foi possível encontrar os detalhes completos do paciente.");
            }
        } catch (err) {
            setError("Não foi possível encontrar os detalhes completos do paciente.");
        }
    }

    async function handleEditFromSearch(cpfOuPaciente) {
        try {
            const paciente = await buscarPacienteCompleto(cpfOuPaciente);
            if (paciente) {
                setPacienteEmEdicao(paciente);
                setView('editPatientView');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setError("Não foi possível encontrar os detalhes completos do paciente.");
            }
        } catch (err) {
            setError("Não foi possível encontrar os detalhes completos do paciente.");
        }
    }

    function handleCloseModal() {
        setIsModalVisible(false);
        setPacienteEmVisualizacao(null);
    }

    function handleEditFromModal(paciente) {
        handleCloseModal();
        setPacienteEmEdicao(paciente);
        setView('editPatientView');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function handleFormSubmit(paciente, cirurgiasSync) {
        setIsLoading(true);
        try {
            // A decisão de criar vs. editar é pelo estado de edição, não pelo
            // campo CPF do formulário: o CPF é obrigatório e vem preenchido
            // também ao cadastrar um paciente novo, então checar `paciente.cpf`
            // sempre caía no PUT (que falha com "Paciente não encontrado").
            let pacienteId;
            if (pacienteEmEdicao) {
                // pacienteEmEdicao vem da busca (aggregate), que sempre expõe `_id`
                // (seja UUID de paciente novo ou ObjectId legado, ambos servem como
                // string) — usado na URL em vez do CPF, que fica só no corpo (evita
                // CPF em texto puro na URL/log/histórico do navegador).
                pacienteId = pacienteEmEdicao._id;
                await api.put(`/api/v2/pacientes/${pacienteId}`, paciente);
            } else {
                // CriarPacienteController devolve `id` (o UUID gerado no domínio),
                // que é exatamente o valor usado como `_id` ao persistir — não `_id`.
                const { data } = await api.post('/api/v2/pacientes', paciente);
                pacienteId = data.id;
            }

            // Cirurgias vivem na própria coleção (Fase 6) — sincronizadas depois
            // do paciente estar salvo, já que uma cirurgia nova precisa do
            // pacienteId, que só existe de verdade neste ponto pra um cadastro novo.
            if (cirurgiasSync) {
                await Promise.all([
                    ...cirurgiasSync.criar.map((c) => api.post('/api/v2/cirurgias', { ...c, pacienteId })),
                    ...cirurgiasSync.atualizar.map((c) => api.put(`/api/v2/cirurgias/${c._id}`, c)),
                    ...cirurgiasSync.apagar.map((id) => api.delete(`/api/v2/cirurgias/${id}`)),
                ]);
            }

            setPacienteEmEdicao(null);
            setView('mainDashboard');
            await carregarPacientes({});
        } catch (err) {
            setError(err.response?.data?.message || "Falha ao salvar o paciente.");
        } finally {
            setIsLoading(false);
        }
    }

    if (!userInfo) {
        return <LoginScreen onLoginSuccess={handleLogin} loginError={loginError} onError={setLoginError} />;
    }

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <Navbar
                userInfo={userInfo}
                onLogout={handleLogout}
                onSwitchToDashboard={() => setView('mainDashboard')}
                onSwitchToPatientList={handleVerTodosPacientes}
                onManageUsers={() => setView('userManagement')}
            />
            <main className="max-w-4xl mx-auto p-4 sm:p-6">
                {view === 'mainDashboard' && (
                    <Dashboard
                        api={api}
                        userInfo={userInfo}
                        stats={dashboardStats}
                        isLoading={isDashboardLoading}
                        onViewAll={handleVerTodosPacientes}
                        onShowNewPatientForm={() => setView('addPatientView')}
                        onGoToSearch={() => setView('dashboard')}
                        onEdit={(paciente) => {
                            setPacienteEmEdicao(paciente);
                            setView('editPatientView');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onViewDetails={handleViewDetails}
                    />
                )}

                {view === 'dashboard' && (
                    <>
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Buscar</h2>

                        <SearchBar
                            value={valorInputBusca}
                            onSearch={handleSearchInputChange}
                            onClear={handleSearchClear}
                        />

                        <FiltrosBuscaPanel onSearch={handleBuscarFiltros} onClear={limparFiltros} isSearching={isLoading} />

                        <div className="mt-8">
                            <SurgeryResultsTable
                                cirurgias={cirurgiasEncontradas}
                                isLoading={isLoading}
                                error={error}
                                onViewDetails={handleViewDetails}
                                onEdit={(paciente) => handleEditFromSearch(paciente.cpf)}
                                onExport={handleExport}
                                isExporting={isExporting}
                            />
                        </div>
                    </>
                )}

                {view === 'addPatientView' && (
                    <PacienteForm
                        onSubmit={handleFormSubmit}
                        pacienteParaEditar={null}
                        onCancel={() => setView('mainDashboard')}
                    />
                )}

                {view === 'editPatientView' && (
                    <PacienteForm
                        onSubmit={handleFormSubmit}
                        pacienteParaEditar={pacienteEmEdicao}
                        onCancel={() => setView('mainDashboard')}
                    />
                )}

                {view === 'userManagement' && (
                    <UserManagement api={api} onBack={() => setView('mainDashboard')} />
                )}

                {isModalVisible && pacienteEmVisualizacao && (
                    <Modal onClose={handleCloseModal}>
                        <PacienteCard
                            paciente={pacienteEmVisualizacao}
                            onDelete={(id) => { handleCloseModal(); handleDelete(id); }}
                            onEdit={handleEditFromModal}
                            isModal={true}
                            onClose={handleCloseModal}
                        />
                    </Modal>
                )}
            </main>
        </div>
    );
}