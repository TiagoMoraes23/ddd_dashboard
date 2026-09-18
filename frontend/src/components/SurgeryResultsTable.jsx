import React, { useState } from 'react';
import { IconEye, IconEdit } from './Icons';
import { CORES_STATUS_CIRURGIA as statusColors } from '../constants/statusCirurgia';

export default function SurgeryResultsTable({ cirurgias, isLoading, error, onViewDetails, onEdit, onExport, isExporting }) {
    const [showRanking, setShowRanking] = useState(false);
    
    const formatarData = (dataISO) => {
        if (!dataISO) return "—";
        const data = new Date(dataISO);
        if (isNaN(data.getTime())) return "—";
        // Adiciona o fuso horário para evitar problemas de um dia a menos
        const dataLocal = new Date(data.valueOf() + data.getTimezoneOffset() * 60000);
        return dataLocal.toLocaleDateString('pt-BR');
    };

    // Função para calcular o ranking
    const getRanking = (data, key) => {
        // Normaliza a string para agrupar (remove acentos e case insensitive)
        const normalize = (str) => {
            if (!str) return '';
            return str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        };

        const groups = data.reduce((acc, item) => {
            const rawValue = item[key] || 'Sem cirurgias';
            const normalizedKey = rawValue === 'Não informado' ? '___N/A___' : normalize(rawValue);

            if (!acc[normalizedKey]) {
                acc[normalizedKey] = { name: rawValue, count: 0 };
            } else if (rawValue !== 'Não informado' && acc[normalizedKey].name === acc[normalizedKey].name.toUpperCase() && rawValue !== rawValue.toUpperCase()) {
                // Se já existe e o nome salvo é todo maiúsculo (ex: NOME), mas o atual não é (ex: Nome), preferimos o atual para exibição.
                acc[normalizedKey].name = rawValue;
            }

            acc[normalizedKey].count += 1;
            return acc;
        }, {});

        return Object.values(groups)
            .sort((a, b) => b.count - a.count);
    };

    const rankingFornecedores = showRanking ? getRanking(cirurgias, 'fornecedor') : [];
    const rankingConvenios = showRanking ? getRanking(cirurgias, 'pacienteConvenio') : [];

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center p-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <div className="text-lg font-semibold text-gray-600">Buscando cirurgias...</div>
            </div>
        );
    }

    if (error) {
        return <div className="text-center p-8 text-red-500 bg-red-100 rounded-lg">{error}</div>;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                    Resultados da Busca
                    {cirurgias.length > 0 && (
                        <span className="text-base font-normal text-gray-600 ml-2">({cirurgias.length} {cirurgias.length === 1 ? 'resultado' : 'resultados'})</span>
                    )}
                </h3>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setShowRanking(true)} 
                        disabled={cirurgias.length === 0}
                        className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Ver Ranking
                    </button>
                    <button onClick={onExport} disabled={isExporting || cirurgias.length === 0} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                        {isExporting ? 'Exportando...' : 'Exportar Planilha'}
                    </button>
                </div>
            </div>

            {/* Modal de Ranking */}
            {showRanking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={() => setShowRanking(false)}>
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h2 className="text-2xl font-bold text-gray-800">Ranking da Busca Atual</h2>
                            <button onClick={() => setShowRanking(false)} className="text-gray-500 hover:text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Ranking de Fornecedores */}
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
                                    🏆 Top Fornecedores (Cirurgia)
                                </h3>
                                <ul className="space-y-2">
                                    {rankingFornecedores.map((item, index) => (
                                        <li key={index} className="flex justify-between items-center p-2 bg-white rounded shadow-sm border-l-4 border-blue-500">
                                            <span className="font-medium text-gray-700">{index + 1}. {item.name}</span>
                                            <span className="font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full text-xs">{item.count}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Ranking de Convênios */}
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center">
                                    🏥 Top Convênios
                                </h3>
                                <ul className="space-y-2">
                                    {rankingConvenios.map((item, index) => (
                                        <li key={index} className="flex justify-between items-center p-2 bg-white rounded shadow-sm border-l-4 border-green-500">
                                            <span className="font-medium text-gray-700">{index + 1}. {item.name}</span>
                                            <span className="font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs">{item.count}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="p-3 font-semibold">Paciente</th>
                            <th className="p-3 font-semibold">Convênio</th>
                            <th className="p-3 font-semibold">Fornecedor Atual</th>
                            <th className="p-3 font-semibold">Fornecedor Cirurgia</th>
                            <th className="p-3 font-semibold">Status</th>
                            <th className="p-3 font-semibold">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cirurgias.length > 0 ? (
                            cirurgias.map((cirurgia, index) => (
                                <tr key={cirurgia._id || index} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                                    <td className="p-3">{cirurgia.pacienteNome || ' '}</td>
                                    <td className="p-3 text-gray-600">{cirurgia.pacienteConvenio || ' '}</td>
                                    <td className="p-3 text-gray-600">{cirurgia.pacienteFornecedor || ' '}</td>
                                    <td className="p-3 text-gray-600">{cirurgia.fornecedor || ' '}</td>
                                    <td className="p-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColors[cirurgia.status] || 'bg-gray-100 text-gray-800'}`}>{cirurgia.status || 'Sem cirurgias'}</span></td>
                                    <td className="p-3 flex items-center space-x-2">
                                        <button onClick={() => onViewDetails(cirurgia.pacienteCpf)} className="text-blue-600 hover:text-blue-800" title="Visualizar Detalhes"><IconEye /></button>
                                        <button onClick={() => onEdit({ cpf: cirurgia.pacienteCpf })} className="text-gray-600 hover:text-gray-800" title="Editar Paciente"><IconEdit /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6" className="p-4 text-center text-gray-500">Nenhum resultado encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}