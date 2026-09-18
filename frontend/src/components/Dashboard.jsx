import React, { useState, useEffect, useRef } from 'react';
import KpiCard from './KpiCard';
import AcaoRapidaButton from './AcaoRapidaButton';
import SearchBar from './SearchBar';
import RegistrosRecentes from './RegistrosRecentes';
import { 
    IconCheckCircle, IconCalendar, IconClock, IconAlertTriangle, 
    IconRepeat, IconSearch, IconPlus, IconUsers 
} from './Icons';

export default function Dashboard({ api, onViewAll, onShowNewPatientForm, onGoToSearch, onViewDetails, onEdit, userInfo, stats, isLoading, error }) {
    const [kpiLoading, setKpiLoading] = useState(false);
    const [quickSearchTerm, setQuickSearchTerm] = useState('');
    const resultsRef = useRef(null);

    useEffect(() => {
        const searchTerm = quickSearchTerm.trim();

        if (!searchTerm) {
            clearKpiFilter();
            return;
        }

        const handler = setTimeout(() => {
            performQuickSearch(searchTerm);
        }, 700); // 700ms de atraso

        return () => {
            clearTimeout(handler);
        };
    }, [quickSearchTerm, api]);

    // Estados para o filtro de KPI
    const [kpiFilter, setKpiFilter] = useState({
        active: false,
        title: '',
        results: [],
        isSearchResult: false,
        kpiType: null, // Adicionado para controlar a visualização da tabela de KPI
    });

    const handleKpiClick = (kpiName, kpiTitle) => {
        if (!api) return;
        setKpiLoading(true);
        api.get(`/api/v2/dashboard/kpi/${kpiName}`)
            .then(res => {
                setKpiFilter({
                    active: true,
                    title: kpiTitle,
                    results: res.data,
                    isSearchResult: false,
                    kpiType: kpiName, // Passa o nome do KPI para o estado
                });
                setTimeout(() => {
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            })
            .catch(err => {
                console.error(`Erro ao buscar dados ${kpiTitle}:`, err);
                alert(`Não foi possível carregar os dados para: ${kpiTitle}`);
            })
            .finally(() => setKpiLoading(false));
    };

    const clearKpiFilter = () => {
        setKpiFilter({ active: false, title: '', results: [], isSearchResult: false, kpiType: null });
    };

    const performQuickSearch = (searchTerm) => {
        if (!api) return;
        setKpiLoading(true);
        // Busca pacientes (não cirurgias): os resultados são exibidos via
        // RegistrosRecentes -> PacienteCard, que espera o formato de paciente
        // completo (nome, cpf, cirurgias[]), não o formato de linha de cirurgia
        // retornado por /api/v2/cirurgias/buscar.
        api.get('/api/v2/pacientes', { params: { q: searchTerm } })
            .then(res => {
                const dados = res.data.pacientes || res.data || [];
                setKpiFilter({
                    active: true,
                    title: `Resultados para "${searchTerm}"`,
                    results: dados,
                    isSearchResult: true,
                    kpiType: null,
                });
                setTimeout(() => {
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            })
            .catch(err => {
                console.error(`Erro ao buscar por "${searchTerm}":`, err);
                alert(`Não foi possível carregar os dados para: "${searchTerm}"`);
            })
            .finally(() => setKpiLoading(false));
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const searchTerm = quickSearchTerm.trim();
        if (searchTerm) {
            performQuickSearch(searchTerm);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <div className="text-xl font-semibold text-gray-600">Carregando dados do dashboard...</div>
            </div>
        );
    }

    if (error) {
        return <div className="text-center p-8 text-red-500 bg-red-100 rounded-lg">{error}</div>;
    }

    return (
        <main>
            {/*<h2 className="text-3xl font-bold text-gray-800 mb-6 animate-fade-in">Dashboard 2.0</h2> */}
            <p className="text-lg text-gray-600 mb-8">
                Olá, <span className="font-bold text-gray-700 capitalize">{userInfo.username}</span>! Seja bem-vindo ao Dashboard de Pacientes 2.0!
            </p>
            
            {/* Seção de KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {stats ? (
                    <>
                        <KpiCard title="Autorizados" value={stats.autorizados} icon={<IconCheckCircle />} color="blue" animationDelay={1} onClick={() => handleKpiClick('autorizados', 'Pacientes com Cirurgia Autorizada')} />
                        <KpiCard title="Agendados" value={stats.agendados} icon={<IconCalendar />} color="green" animationDelay={2} onClick={() => handleKpiClick('agendados', 'Pacientes com Cirurgia Agendada')} />
                        <KpiCard title="Agend. Pendente" value={stats.agendamentoPendente} icon={<IconClock />} color="yellow" animationDelay={3} onClick={() => handleKpiClick('agendamentoPendente', 'Pacientes com Agendamento Pendente')} />
                        <KpiCard title="RNM Vencidas" value={stats.rnmVencidas} icon={<IconAlertTriangle />} color="red" animationDelay={4} onClick={() => handleKpiClick('rnmVencidas', 'Pacientes com RNM Vencida')} />
                        <KpiCard title="Solicitar Nova RNM" value={stats.solicitarNovaRnm} icon={<IconAlertTriangle />} color="purple" animationDelay={5} onClick={() => handleKpiClick('solicitarNovaRnm', 'Pacientes para Solicitar Nova RNM')} />
                        <KpiCard title="Reentrada (+3 meses)" value={stats.reentrada} icon={<IconRepeat />} color="indigo" animationDelay={6} onClick={() => handleKpiClick('reentrada', 'Pacientes para Reentrada (+3 meses)')} />
                    </>
                ) : (
                    <p>Carregando KPIs...</p>
                )}
            </div>

            {/* Seção de Ações Rápidas */}
            <div className="mb-8 animate-slide-in-up" style={{ animationDelay: '300ms' }}>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Ações Rápidas</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <AcaoRapidaButton title="Ver Todos Pacientes" icon={<IconUsers />} onClick={onViewAll} />
                    <AcaoRapidaButton title="Cadastrar Paciente" icon={<IconPlus />} onClick={onShowNewPatientForm} />
                </div>
                <div>
                    <form onSubmit={handleSearchSubmit}>
                        <SearchBar 
                            value={quickSearchTerm}
                            onSearch={setQuickSearchTerm}
                            onClear={() => setQuickSearchTerm('')}
                        />
                    </form>
                    <div className="text-right -mt-4">
                        <button onClick={onGoToSearch} className="text-sm text-blue-600 hover:underline font-semibold">
                            Busca Avançada
                        </button>
                    </div>
                </div>
            </div>

            {/* Seção de Registros Recentes */}
            <div ref={resultsRef} className="animate-slide-in-up" style={{ animationDelay: '400ms' }}>
                <RegistrosRecentes
                    api={api}
                    onViewDetails={onViewDetails}
                    onEdit={onEdit}
                    isLoading={kpiLoading}
                    filteredData={kpiFilter.active ? kpiFilter.results : null}
                    title={kpiFilter.active ? kpiFilter.title : "Registros Recentes"}
                    onClearFilter={kpiFilter.active ? clearKpiFilter : null}
                    isSearchResult={kpiFilter.isSearchResult}
                    kpiType={kpiFilter.kpiType}
                />
            </div>
        </main>
    );
}