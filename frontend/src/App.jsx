import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import fileDownload from "js-file-download";

import PacienteCard from "./components/PacienteCard.jsx";
import SearchBar from "./components/SearchBar.jsx";
import PacienteForm from "./components/PacienteForm.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import UserManagement from "./components/UserManagement.jsx";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import SurgeryFilterPanel from "./components/SurgeryFilterPanel.jsx";
import SurgeryResultsTable from "./components/SurgeryResultsTable.jsx";
import Modal from "./components/Modal.jsx";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
    const [userInfo, setUserInfo] = useState(() => {
        try {
            const storedUserInfo = localStorage.getItem('userInfo');
            return storedUserInfo ? JSON.parse(storedUserInfo) : null;
        } catch (error) {
            console.error("Falha ao analisar userInfo do localStorage", error);
            localStorage.removeItem('userInfo');
            return null;
        }
    });
    const [view, setView] = useState('mainDashboard');
    const [pacientes, setPacientes] = useState([]);
    const [cirurgiasEncontradas, setCirurgiasEncontradas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loginError, setLoginError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [buscaAvancadaAtiva, setBuscaAvancadaAtiva] = useState(false);
    const [filtrosAvancados, setFiltrosAvancados] = useState({});
    const [dashboardStats, setDashboardStats] = useState(null);
    const [isDashboardLoading, setIsDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState(null);

    const [valorInputBusca, setValorInputBusca] = useState("");
    const [pacienteEmEdicao, setPacienteEmEdicao] = useState(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [pacienteEmVisualizacao, setPacienteEmVisualizacao] = useState(null);

    const api = useMemo(() => {
        if (!userInfo?.token) return null;
        return axios.create({
            baseURL: API_BASE_URL,
            headers: { Authorization: `Bearer ${userInfo.token}` },
        });
    }, [userInfo?.token]);
    
    const handleLogout = useCallback(() => {
        localStorage.removeItem('userInfo');
        setUserInfo(null);
        setPacientes([]);
        setView('mainDashboard');
    }, []);
    
    const handleLogin = async ({ username, password }) => {
        try {
            const { data } = await axios.post(`${API_BASE_URL}/api/auth/login`, { username, password });
            localStorage.setItem('userInfo', JSON.stringify(data));
            setUserInfo(data);
            setLoginError(null);
            setView('mainDashboard');
        } catch (err) {
            const message = err.response?.data?.message || "Erro ao tentar fazer login.";
            setLoginError(message);
            throw new Error(message);
        }
    };
    
    const carregarPacientes = useCallback(async (params) => {
        if (!api) return;
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/api/pacientes', { params });
            setPacientes(data.pacientes || data || []);
        } catch (err) {
            setError("Não foi possível carregar os pacientes.");
            if (err.response?.status === 401) handleLogout();
        } finally {
            setIsLoading(false); 
        }
    }, [api, handleLogout]);

    const carregarDashboardStats = useCallback(async () => {
        if (!api) return;
        setIsDashboardLoading(true);
        setDashboardError(null);
        try {
            const { data } = await api.get('/api/dashboard/stats');
            setDashboardStats(data);
        } catch (err) {
            setDashboardError("Não foi possível carregar os dados do dashboard.");
            if (err.response?.status === 401) handleLogout();
        } finally {
            setIsDashboardLoading(false);
        }
    }, [api, handleLogout]);

    useEffect(() => {
        if (userInfo) {
            carregarPacientes({});
        }
    }, [userInfo, carregarPacientes]);

    useEffect(() => {
        if (userInfo && view === 'mainDashboard') {
            carregarDashboardStats();
        }
    }, [userInfo, view, carregarDashboardStats]);

    useEffect(() => {
        if (!userInfo || !api) return;

        const intervalId = setInterval(() => {
            api.get('/api/users/ping')
                .then(() => console.log("ping pong ok!"))
                .catch(err => {
                if (err.response?.status === 401) {
                    handleLogout();
                }
            });
        }, 10 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [userInfo, api, handleLogout]);

    useEffect(() => {
        if (view !== 'dashboard' || !buscaAvancadaAtiva) {
            return;
        }

        const handler = setTimeout(() => {
            handleAdvancedSearch(filtrosAvancados);
        }, 700);

        return () => clearTimeout(handler);
    }, [valorInputBusca]); 

    const handleAdvancedSearch = async (filtros, searchTerm) => {
        if (!api) return;

        setIsLoading(true);
        setError(null);
        setBuscaAvancadaAtiva(true);
        setFiltrosAvancados(filtros);
        
        const params = { ...filtros };
        const q = searchTerm !== undefined ? searchTerm : valorInputBusca;
        if (q) {
            params.q = q;
        }
        
        try {
            const { data } = await api.get('/api/cirurgias/buscar', { params });
            setCirurgiasEncontradas(data);
        } catch (err) {
            setError("Não foi possível buscar as cirurgias.");
            if (err.response?.status === 401) handleLogout();
        } finally {
            setIsLoading(false);
        }
    };

    const clearAdvancedSearch = () => {
        setBuscaAvancadaAtiva(false);
        setFiltrosAvancados({});
        setValorInputBusca("");
        setCirurgiasEncontradas([]);
    };

    const clearSimpleSearch = () => {
        setValorInputBusca('');
    };

    const handleExport = async () => {
        if (!api) return;
        setIsExporting(true);
        try {
            const params = { ...filtrosAvancados, q: valorInputBusca };
            const response = await api.get('/api/cirurgias/exportar', { 
                params,
                responseType: 'blob',
            });
            const filename = `relatorio_pacientes_${new Date().toISOString().split('T')[0]}.xlsx`;
            fileDownload(response.data, filename);
        } catch (err) {
            console.error("Erro ao exportar:", err);
            alert("Não foi possível gerar o relatório.");
        } finally {
            setIsExporting(false);
        }
    };

    async function handleFormSubmit(paciente) {
        try {
            if (pacienteEmEdicao) {
                await api.put(`/api/pacientes/${paciente.cpf}`, paciente);
                setPacienteEmEdicao(null);
                setView('mainDashboard');
            } else {
                await api.post('/api/pacientes', paciente);
                setView('mainDashboard');
            }
            carregarPacientes({});
        } catch (err) {
            alert(`Erro: ${err.response?.data?.message || "Não foi possível salvar o paciente."}`);
        }
    }

    async function deletarPaciente(cpf) {
        if (window.confirm("Tem certeza que deseja excluir este paciente?")) {
            try {
                await api.delete(`/api/pacientes/${cpf}`);
                handleCloseModal();
                alert("Paciente excluido com sucesso.");
                carregarPacientes({});
                carregarDashboardStats();
            } catch (err) {
                console.error("Erro ao deletar paciente:", err);
                alert(`Erro ao excluir o paciente: ${err.response?.data?.message || 'Erro desconhecido.'}`);
            }
        }
    }

    function handleEdit(paciente) {
        if (isModalVisible) {
            setIsModalVisible(false);
            setPacienteEmVisualizacao(null);
        }
        setPacienteEmEdicao(paciente);
        setView('editPatientView');
        window.scrollTo(0, 0);
    }

    const handleEditWrapper = async (pacienteData) => {
        let pacienteCompleto = pacientes.find(p => p.cpf === pacienteData.cpf);
        if (pacienteCompleto) {
            handleEdit(pacienteCompleto);
        } else {
            try {
                if (!api) return;
                const { data } = await api.get(`/api/pacientes/${pacienteData.cpf}`);
                handleEdit(data);
            } catch (error) {
                console.error("Falha ao buscar detalhes do paciente para edição:", error);
                alert("Não foi possível encontrar os detalhes completos do paciente para edição.");
            }
        }
    };

    function handleAddNew() {
        setPacienteEmEdicao(null);
        setView('addPatientView');
        window.scrollTo(0, 0);
    }

    const handleViewDetails = async (cpf) => {
        let paciente = pacientes.find(p => p.cpf === cpf);
        if (paciente) {
            setPacienteEmVisualizacao(paciente);
            setIsModalVisible(true);
        } else {
            try {
                if (!api) return;
                const { data } = await api.get(`/api/pacientes/${cpf}`);
                setPacienteEmVisualizacao(data);
                setIsModalVisible(true);
            } catch (error) {
                console.error("Falha ao buscar detalhes do paciente:", error);
                alert("Não foi possível encontrar os detalhes completos do paciente.");
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
        setPacienteEmVisualizacao(null);
    };

    const handleViewAllSurgeries = () => {
        setView('dashboard');
        setValorInputBusca("");
        handleAdvancedSearch({}, "");
        window.scrollTo(0, 0);
    };

    const handleGoToSearch = () => {
        setView('dashboard');
        clearAdvancedSearch();
        window.scrollTo(0, 0);
    };

    const handleQuickSearch = (term) => {
        setView('dashboard');
        setValorInputBusca(term);
        handleAdvancedSearch({}, term);
    };

    if (!userInfo) {
        return <LoginScreen onLoginSuccess={handleLogin} loginError={loginError} onError={setLoginError} />;
    }

    if (isLoading && pacientes.length === 0 && cirurgiasEncontradas.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <div className="text-xl font-semibold text-gray-600">Iniciando o sistema...</div>
                <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar 
                userInfo={userInfo}
                onLogout={handleLogout}
                onManageUsers={() => setView('userManagement')}
                onSwitchToDashboard={() => setView('mainDashboard')}
                onSwitchToPatientList={handleViewAllSurgeries}
            />
            
            <main className="max-w-4xl mx-auto p-4 sm:p-6">
                {view === 'mainDashboard' && (
                    <Dashboard 
                        userInfo={userInfo}
                        api={api}
                        stats={dashboardStats}
                        isLoading={isDashboardLoading}
                        error={dashboardError}
                        onViewAll={handleViewAllSurgeries}
                        onShowNewPatientForm={handleAddNew}
                        onGoToSearch={handleGoToSearch}
                        onViewDetails={handleViewDetails}
                        onQuickSearch={handleQuickSearch}
                        onEdit={handleEditWrapper}
                    />
                )}

                {view === 'dashboard' && (
                    <>
                        <h2 className="text-3xl font-bold text-gray-800 mb-6 animate-fade-in">Buscar</h2>
                        
                        <SearchBar 
                            value={valorInputBusca}
                            onSearch={setValorInputBusca} 
                            onClear={clearSimpleSearch}
                        />

                        <SurgeryFilterPanel onSearch={handleAdvancedSearch} onClear={clearAdvancedSearch} isSearching={isLoading} />

                        <div className="mt-8">
                            <SurgeryResultsTable 
                                cirurgias={cirurgiasEncontradas}
                                isLoading={isLoading}
                                error={error}
                                onViewDetails={handleViewDetails}
                                onEdit={handleEditWrapper}
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

                {view === 'userManagement' && <UserManagement api={api} onBack={() => setView('mainDashboard')} />}

                {isModalVisible && pacienteEmVisualizacao && (
                    <Modal onClose={handleCloseModal}>
                        <PacienteCard 
                            paciente={pacienteEmVisualizacao} 
                            onDelete={deletarPaciente}
                            onEdit={handleEditWrapper}
                            isModal={true}
                            onClose={handleCloseModal}
                        />
                    </Modal>
                )}
            </main>
        </div>
    );
}
