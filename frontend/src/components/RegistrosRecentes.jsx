import React, { useState, useEffect } from 'react';
import { IconEye, IconEdit } from './Icons';

const statusColors = {
    'Realizado': 'bg-green-100 text-green-800',
    'Agendado': 'bg-blue-100 text-blue-800',
    'Autorizado': 'bg-yellow-100 text-yellow-800',
    'Agendamento Pendente': 'bg-orange-100 text-orange-800',
    'Senha expirada': 'bg-red-100 text-red-800',
    'Cancelado (outro motivo)': 'bg-red-100 text-red-800',
};

export default function RegistrosRecentes({ api, onViewDetails, onEdit, isLoading, filteredData, title, onClearFilter, isSearchResult, kpiType }) {
    const [recentes, setRecentes] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (filteredData !== null) {
            setRecentes(filteredData);
            return;
        }

        if (!api) return;
        api.get('/api/pacientes/recentes')
            .then(res => setRecentes(res.data))
            .catch(err => {
                console.error("Erro ao buscar recentes:", err);
                setError("Não foi possível carregar os registros recentes.");
            });
    }, [api, filteredData]);

    const formatarData = (dataISO) => {
        if (!dataISO) return "—";
        const data = new Date(dataISO);
        if (isNaN(data.getTime())) return "—";
        const dataLocal = new Date(data.valueOf() + data.getTimezoneOffset() * 60000);
        return dataLocal.toLocaleDateString('pt-BR');
    };

    const getMostRecentSurgeryStatus = (cirurgias) => {
        if (!cirurgias || cirurgias.length === 0) {
            return { status: 'Sem Cirurgias', color: 'bg-gray-100 text-gray-800' };
        }
    
        const sortedCirurgias = [...cirurgias].sort((a, b) => {
            const dateA = a.data ? new Date(a.data).getTime() : 0;
            const dateB = b.data ? new Date(b.data).getTime() : 0;
            if (dateB > dateA) return 1;
            if (dateA > dateB) return -1;
            return 0;
        });
    
        const mostRecentStatus = sortedCirurgias[0].status || 'Status Indefinido';
        
        return {
            status: mostRecentStatus,
            color: statusColors[mostRecentStatus] || 'bg-gray-100 text-gray-800'
        };
    };

    const renderSearchResults = () => (
        <>
        <table className="w-full text-left hidden md:table">
            <thead className="bg-gray-50">
                <tr className="border-b">
                    <th className="p-3 font-semibold min-w-[200px]">Paciente</th>
                    <th className="p-3 font-semibold">Convênio</th>
                    <th className="p-3 font-semibold">Fornecedor Atual</th>
                    <th className="p-3 font-semibold">Fornecedor<br />Cirurgia</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold hidden md:table-cell">Ações</th>
                </tr>
            </thead>
            {!isLoading && (<tbody>
                {recentes.length > 0 ? (
                    recentes.map((cirurgia, index) => (
                        <tr key={cirurgia._id || index} onClick={() => onViewDetails(cirurgia.pacienteCpf)} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer align-middle">
                            <td className="p-3 align-middle min-w-[200px] break-words">{cirurgia.pacienteNome || 'N/A'}</td>
                            <td className="p-3 text-gray-600 align-middle">{cirurgia.pacienteConvenio || 'N/A'}</td>
                            <td className="p-3 text-gray-600 align-middle">{cirurgia.pacienteFornecedor || 'N/A'}</td>
                            <td className="p-3 text-gray-600 align-middle">{cirurgia.fornecedor || ' '}</td>
                            <td className="p-3 align-middle"><span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColors[cirurgia.status] || 'bg-gray-100 text-gray-800'}`}>{cirurgia.status || 'Sem cirurgias'}</span></td>
                            <td className="p-3 hidden md:table-cell align-middle">
                                <div className="flex items-center space-x-2">
                                <button onClick={(e) => { e.stopPropagation(); onViewDetails(cirurgia.pacienteCpf); }} className="text-blue-600 hover:text-blue-800" title="Visualizar Detalhes"><IconEye /></button>
                                <button onClick={(e) => { e.stopPropagation(); onEdit({ cpf: cirurgia.pacienteCpf }); }} className="text-gray-600 hover:text-gray-800" title="Editar Paciente"><IconEdit /></button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan="6" className="p-4 text-center text-gray-500">Nenhum resultado encontrado.</td></tr>
                )}
            </tbody>)}
        </table>

        <div className="md:hidden space-y-3">
            {recentes.length > 0 ? recentes.map((cirurgia, index) => (
                <div key={cirurgia._id || index} onClick={() => onViewDetails(cirurgia.pacienteCpf)} className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm active:bg-gray-100 transition-colors cursor-pointer">
                    <div className="font-bold text-gray-800 text-lg mb-2">{cirurgia.pacienteNome || 'N/A'}</div>
                    <div className="text-sm text-gray-600 mb-1"><span className="font-semibold">Convênio:</span> {cirurgia.pacienteConvenio || 'N/A'}</div>
                    <div className="text-sm text-gray-600 mb-1"><span className="font-semibold">Forn. Cirurgia:</span> {cirurgia.fornecedor || 'N/A'}</div>
                    <div className="mt-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[cirurgia.status] || 'bg-gray-100 text-gray-800'}`}>{cirurgia.status || 'N/A'}</span>
                    </div>
                </div>
            )) : <div className="p-4 text-center text-gray-500">Nenhum resultado encontrado.</div>}
        </div>
        </>
    );

    const renderDefaultView = () => (
        <>
        <table className="w-full text-left hidden md:table">
            <thead className="bg-gray-50">
                <tr className="border-b"><th className="p-3 font-semibold min-w-[200px]">Paciente</th><th className="p-3 font-semibold">Status Última Cirurgia</th><th className="p-3 font-semibold">Última Atualização</th><th className="p-3 font-semibold hidden md:table-cell">Ações</th></tr>
            </thead>
            {!isLoading && (<tbody>
                {recentes.length > 0 ? (
                    recentes.map((paciente, index) => {
                        const { status, color } = getMostRecentSurgeryStatus(paciente.cirurgias);
                        return (
                            <tr key={paciente._id} onClick={() => onViewDetails(paciente.cpf)} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer align-middle" style={{ animation: `fadeIn 0.5s ease-out ${index * 100}ms backwards`}}>
                                <td className="p-3 align-middle min-w-[200px] break-words">{paciente.nome}</td>
                                <td className="p-3 align-middle"><span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${color}`}>{status}</span></td>
                                <td className="p-3 text-gray-500 text-sm align-middle">{new Date(paciente.updatedAt).toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 hidden md:table-cell align-middle">
                                    <div className="flex items-center space-x-2">
                                    <button onClick={(e) => { e.stopPropagation(); onViewDetails(paciente.cpf); }} className="text-blue-600 hover:text-blue-800" title="Visualizar Detalhes"><IconEye /></button><button onClick={(e) => { e.stopPropagation(); onEdit(paciente); }} className="text-gray-600 hover:text-gray-800" title="Editar Paciente"><IconEdit /></button>
                                    </div>
                                </td>
                            </tr>
                        )
                    })
                ) : (
                    <tr><td colSpan="4" className="p-4 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                )}
            </tbody>)}
        </table>

        <div className="md:hidden space-y-3">
            {recentes.length > 0 ? recentes.map((paciente, index) => {
                const { status, color } = getMostRecentSurgeryStatus(paciente.cirurgias);
                return (
                    <div key={paciente._id} onClick={() => onViewDetails(paciente.cpf)} className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm active:bg-gray-100 transition-colors cursor-pointer" style={{ animation: `fadeIn 0.5s ease-out ${index * 100}ms backwards`}}>
                        <div className="font-bold text-gray-800 text-lg mb-2">{paciente.nome}</div>
                        <div className="flex justify-between items-center">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>{status}</span>
                            <span className="text-gray-500 text-xs">Atualizado: {new Date(paciente.updatedAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>
                )
            }) : <div className="p-4 text-center text-gray-500">Nenhum registro encontrado.</div>}
        </div>
        </>
    );

    const renderKpiSurgeryView = () => (
        <>
        <table className="w-full text-left hidden md:table">
            <thead className="bg-gray-50">
                <tr className="border-b">
                    <th className="p-3 font-semibold min-w-[250px]">Paciente</th> 
                    {kpiType !== 'reentrada' && <th className="p-3 font-semibold hidden md:table-cell">Convênio</th>}
                    {kpiType === 'reentrada' && <th className="p-3 font-semibold">Data<br />Cirurgia</th>}
                    {kpiType === 'reentrada' && <th className="p-3 font-semibold">Região</th>}
                    <th className="p-3 font-semibold">Fornecedor<br />Cirurgia</th>
                    {(kpiType === 'reentrada' || kpiType === 'agendamentoPendente') && <th className="p-3 font-semibold min-w-[100px]">Hospital</th>}
                    {kpiType !== 'reentrada' && <th className="p-3 font-semibold">Status</th>}
                    {kpiType === 'agendados' && <th className="p-3 font-semibold">Data</th>}
                    {kpiType === 'agendados' && <th className="p-3 font-semibold">Horário</th>}
                    <th className="p-3 font-semibold hidden md:table-cell">Ações</th>
                </tr>
            </thead>
            {!isLoading && (<tbody>
                {recentes.length > 0 ? (
                    recentes.map((cirurgia, index) => (
                        <tr key={cirurgia._id || index} onClick={() => onViewDetails(cirurgia.pacienteCpf)} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer align-middle">
                            <td className="p-3 align-middle min-w-[200px] break-words">{cirurgia.pacienteNome || 'N/A'}</td>
                            {kpiType !== 'reentrada' && <td className="p-3 text-gray-600 hidden md:table-cell align-middle">{cirurgia.pacienteConvenio || 'N/A'}</td>}
                            {kpiType === 'reentrada' && <td className="p-3 text-gray-600 align-middle">{formatarData(cirurgia.data)}</td>}
                            {kpiType === 'reentrada' && <td className="p-3 text-gray-600 align-middle"><div className="max-w-[8ch] break-words leading-tight">{cirurgia.regiao || 'N/A'}</div></td>}
                            <td className="p-3 text-gray-600 align-middle">{cirurgia.fornecedor || 'N/A'}</td>
                            {(kpiType === 'reentrada' || kpiType === 'agendamentoPendente') && <td className="p-3 text-gray-600 align-middle">{cirurgia.hospital || 'N/A'}</td>}
                            {kpiType !== 'reentrada' && <td className="p-3 align-middle whitespace-nowrap"><span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColors[cirurgia.status] || 'bg-gray-100 text-gray-800'}`}>{cirurgia.status || 'N/A'}</span></td>}
                            {kpiType === 'agendados' && <td className="p-3 text-gray-600 align-middle">{formatarData(cirurgia.data)}</td>}
                            {kpiType === 'agendados' && <td className="p-3 text-gray-600 align-middle">{cirurgia.horario || '—'}</td>}
                            <td className="p-3 hidden md:table-cell align-middle">
                                <div className="flex items-center space-x-2">
                                <button onClick={(e) => { e.stopPropagation(); onViewDetails(cirurgia.pacienteCpf); }} className="text-blue-600 hover:text-blue-800" title="Visualizar Detalhes"><IconEye /></button>
                                <button onClick={(e) => { e.stopPropagation(); onEdit({ cpf: cirurgia.pacienteCpf }); }} className="text-gray-600 hover:text-gray-800" title="Editar Paciente"><IconEdit /></button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan={kpiType === 'agendados' ? 7 : (kpiType === 'agendamentoPendente' || kpiType === 'reentrada' ? 6 : 5)} className="p-4 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                )}
            </tbody>)}
        </table>

        <div className="md:hidden space-y-3">
            {recentes.length > 0 ? recentes.map((cirurgia, index) => (
                <div key={cirurgia._id || index} onClick={() => onViewDetails(cirurgia.pacienteCpf)} className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm active:bg-gray-100 transition-colors cursor-pointer">
                    <div className="font-bold text-gray-800 text-lg mb-1">{cirurgia.pacienteNome || 'N/A'}</div>
                    
                    {kpiType === 'agendados' && (
                        <>
                            <div className="text-sm text-gray-600 mb-2">{cirurgia.fornecedor || 'Fornecedor N/A'}</div>
                            <div className="flex justify-between items-center">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[cirurgia.status] || 'bg-gray-100 text-gray-800'}`}>{cirurgia.status || 'N/A'}</span>
                                <span className="font-semibold text-gray-700 text-sm">{formatarData(cirurgia.data)} {cirurgia.horario ? `- ${cirurgia.horario}` : ''}</span>
                            </div>
                        </>
                    )}

                    {kpiType === 'agendamentoPendente' && (
                        <>
                            <div className="text-sm text-gray-600 mb-2">Fornecedor: {cirurgia.fornecedor || 'Fornecedor N/A'}</div>
                            <div className="text-sm text-gray-600 mb-2">Hospital: {cirurgia.hospital || 'Hospital N/A'}</div>
                            <div><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[cirurgia.status] || 'bg-gray-100 text-gray-800'}`}>{cirurgia.status || 'N/A'}</span></div>
                        </>
                    )}

                    {kpiType !== 'agendados' && kpiType !== 'agendamentoPendente' && (
                        <>
                            {kpiType === 'reentrada' && <div className="text-sm text-gray-600 mb-1"><span className="font-semibold">Data:</span> {formatarData(cirurgia.data)}</div>}
                            <div className="text-sm text-gray-600 mb-2">Fornecedor: {cirurgia.fornecedor || 'Fornecedor N/A'}</div>
                            <div><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[cirurgia.status] || 'bg-gray-100 text-gray-800'}`}>Região: {cirurgia.regiao || 'N/A'}</span></div>
                        </>
                    )}
                </div>
            )) : <div className="p-4 text-center text-gray-500">Nenhum registro encontrado.</div>}
        </div>
        </>
    );

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                {onClearFilter && (
                    <button onClick={onClearFilter} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-md">
                        Limpar Filtro
                    </button>
                )}
            </div>

            {error && <p className="text-red-500">{error}</p>}
            {isLoading && (
                <div className="flex justify-center items-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-gray-600 font-semibold">Carregando...</span>
                </div>
            )}

            <div className="overflow-x-auto">
                {isSearchResult 
                    ? renderSearchResults() 
                    : (kpiType === 'agendados' || kpiType === 'agendamentoPendente' || kpiType === 'autorizados' || kpiType === 'reentrada')
                        ? renderKpiSurgeryView()
                        : renderDefaultView()}
            </div>
        </div>
    );
}