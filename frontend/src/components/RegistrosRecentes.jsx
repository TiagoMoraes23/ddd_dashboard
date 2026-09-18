import React, { useState, useEffect } from 'react';
import { IconEye, IconEdit } from './Icons';
import { CORES_STATUS_CIRURGIA as statusColors } from '../constants/statusCirurgia';

function formatarData(dataISO) {
    if (!dataISO) return '—';
    const data = new Date(dataISO);
    if (isNaN(data.getTime())) return '—';
    const dataLocal = new Date(data.valueOf() + data.getTimezoneOffset() * 60000);
    return dataLocal.toLocaleDateString('pt-BR');
}

function getUltimaCirurgia(paciente) {
    const cirurgias = paciente.cirurgias || [];
    if (cirurgias.length === 0) return null;
    return [...cirurgias].sort((a, b) => {
        const dateA = a.data ? new Date(a.data).getTime() : 0;
        const dateB = b.data ? new Date(b.data).getTime() : 0;
        return dateB - dateA;
    })[0];
}

// Para os KPIs baseados em status de cirurgia, encontra a cirurgia que fez o
// paciente qualificar para aquele KPI (mesmo critério usado no backend, em
// BuscarPacientesPorKpiQuery), para exibir os dados relevantes na linha.
function getCirurgiaRelevante(paciente, kpiType) {
    const cirurgias = paciente.cirurgias || [];
    const porStatus = (status) => cirurgias.find((c) => c.status === status);

    switch (kpiType) {
        case 'autorizados':
            return porStatus('Autorizado');
        case 'agendados':
            return porStatus('Agendado');
        case 'agendamentoPendente':
            return porStatus('Agendamento Pendente');
        case 'reentrada': {
            const tresMesesAtras = new Date();
            tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
            const qualificadas = cirurgias.filter(
                (c) => c.status === 'Realizado' && c.data && new Date(c.data) < tresMesesAtras
            );
            return qualificadas.sort((a, b) => new Date(b.data) - new Date(a.data))[0] || null;
        }
        default:
            return null;
    }
}

// Reentrada e Agendados precisam aparecer ordenados pela data da cirurgia
// relevante (não pela última atualização do paciente, que é a ordenação que
// vem do backend) — reentrada da mais recente pra mais antiga, agendados da
// mais próxima pra mais distante (e por horário, quando o mesmo dia tem mais
// de uma cirurgia agendada).
function ordenarPorRelevancia(dados, kpiType) {
    if (kpiType === 'reentrada') {
        return [...dados].sort((a, b) => {
            const dataA = getCirurgiaRelevante(a, kpiType)?.data;
            const dataB = getCirurgiaRelevante(b, kpiType)?.data;
            return new Date(dataB || 0) - new Date(dataA || 0);
        });
    }

    if (kpiType === 'agendados') {
        return [...dados].sort((a, b) => {
            const cirurgiaA = getCirurgiaRelevante(a, kpiType);
            const cirurgiaB = getCirurgiaRelevante(b, kpiType);
            const dataA = cirurgiaA?.data ? new Date(cirurgiaA.data).getTime() : Infinity;
            const dataB = cirurgiaB?.data ? new Date(cirurgiaB.data).getTime() : Infinity;
            if (dataA !== dataB) return dataA - dataB;
            return (cirurgiaA?.horario || '').localeCompare(cirurgiaB?.horario || '');
        });
    }

    return dados;
}

const StatusBadge = ({ status }) => (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status || 'Sem Cirurgias'}
    </span>
);

// Monta, por modo de exibição, as colunas (desktop) e os pares label/valor (mobile) de uma linha.
// Layout/ordem de colunas por kpiType espelha o legado (dashboard_v2) exatamente.
function montarCampos(item, { isSearchResult, kpiType }) {
    if (kpiType === 'reentrada') {
        const cirurgia = getCirurgiaRelevante(item, kpiType);
        return [
            { label: 'Data Cirurgia', value: formatarData(cirurgia?.data) },
            { label: 'Região', value: Array.isArray(cirurgia?.regiao) ? (cirurgia.regiao.join(', ') || '—') : (cirurgia?.regiao || '—') },
            { label: 'Fornecedor Cirurgia', value: cirurgia?.fornecedor || '—' },
            { label: 'Hospital', value: cirurgia?.hospital || '—' },
        ];
    }

    if (kpiType === 'rnmVencidas' || kpiType === 'solicitarNovaRnm') {
        const cirurgia = getUltimaCirurgia(item);
        return [
            { label: 'Status Última Cirurgia', value: <StatusBadge status={cirurgia?.status} />, raw: true },
            { label: 'Última Atualização', value: formatarData(item.updatedAt) },
        ];
    }

    if (kpiType === 'agendados') {
        const cirurgia = getCirurgiaRelevante(item, kpiType);
        return [
            { label: 'Convênio', value: item.convenio || '—' },
            { label: 'Fornecedor Cirurgia', value: cirurgia?.fornecedor || '—' },
            { label: 'Status', value: <StatusBadge status={cirurgia?.status} />, raw: true },
            { label: 'Data', value: formatarData(cirurgia?.data) },
            { label: 'Horário', value: cirurgia?.horario || '—' },
        ];
    }

    if (kpiType === 'agendamentoPendente') {
        const cirurgia = getCirurgiaRelevante(item, kpiType);
        return [
            { label: 'Convênio', value: item.convenio || '—' },
            { label: 'Fornecedor Cirurgia', value: cirurgia?.fornecedor || '—' },
            { label: 'Hospital', value: cirurgia?.hospital || '—' },
            { label: 'Status', value: <StatusBadge status={cirurgia?.status} />, raw: true },
        ];
    }

    if (kpiType === 'autorizados') {
        const cirurgia = getCirurgiaRelevante(item, kpiType);
        return [
            { label: 'Convênio', value: item.convenio || '—' },
            { label: 'Fornecedor Cirurgia', value: cirurgia?.fornecedor || '—' },
            { label: 'Status', value: <StatusBadge status={cirurgia?.status} />, raw: true },
        ];
    }

    if (isSearchResult) {
        const cirurgia = getUltimaCirurgia(item);
        return [
            { label: 'Convênio', value: item.convenio || '—' },
            { label: 'Fornecedor Atual', value: (Array.isArray(item.fornecedor) ? item.fornecedor.join(', ') : item.fornecedor) || '—' },
            { label: 'Status', value: <StatusBadge status={cirurgia?.status} />, raw: true },
        ];
    }

    // Modo padrão: status da cirurgia mais recente + data de atualização.
    const cirurgia = getUltimaCirurgia(item);
    return [
        { label: 'Status', value: <StatusBadge status={cirurgia?.status} />, raw: true },
        { label: 'Atualizado em', value: formatarData(item.updatedAt) },
    ];
}

function RegistroRowDesktop({ item, campos, onViewDetails, onEdit }) {
    return (
        <tr
            className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onViewDetails(item)}
        >
            <td className="p-3 font-normal text-gray-800">{item.nome}</td>
            {campos.map((campo, i) => (
                <td key={i} className="p-3 text-gray-600">{campo.value}</td>
            ))}
            <td className="p-3">
                <div className="flex items-center space-x-2">
                    <button onClick={(e) => { e.stopPropagation(); onViewDetails(item); }} className="text-blue-600 hover:text-blue-800" title="Visualizar Detalhes"><IconEye /></button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="text-gray-600 hover:text-gray-800" title="Editar Paciente"><IconEdit /></button>
                </div>
            </td>
        </tr>
    );
}

function RegistroCardMobile({ item, campos, onViewDetails, onEdit }) {
    return (
        <div
            className="border border-gray-200 rounded-lg mb-3 bg-white p-3 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => onViewDetails(item)}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="font-normal text-gray-800">{item.nome}</span>
                <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); onViewDetails(item); }} className="text-blue-600 hover:text-blue-800" title="Visualizar Detalhes"><IconEye /></button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="text-gray-600 hover:text-gray-800" title="Editar Paciente"><IconEdit /></button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-sm">
                {campos.map((campo, i) => (
                    <div key={i}>
                        <span className="font-semibold text-gray-600">{campo.label}:</span> {campo.value}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function RegistrosRecentes({ api, onViewDetails, onEdit, isLoading: isDashboardLoading, filteredData, title, onClearFilter, isSearchResult, kpiType }) {
    const [recentes, setRecentes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (filteredData) return;
        if (!api) return;

        setIsLoading(true);
        api.get('/api/v2/pacientes')
            .then(res => {
                const dados = res.data.pacientes || res.data || [];
                setRecentes(dados.slice(0, 10));
            })
            .catch(err => {
                console.error("Erro ao buscar recentes:", err);
                setError("Não foi possível carregar os registros recentes.");
            })
            .finally(() => setIsLoading(false));
    }, [api, filteredData]);

    const displayData = ordenarPorRelevancia(filteredData || recentes, kpiType);
    const isFetching = isDashboardLoading || isLoading;
    const modo = { isSearchResult, kpiType };

    // Colunas do cabeçalho da tabela desktop, derivadas dos campos do primeiro item (todos os itens seguem o mesmo modo).
    const colunas = displayData.length > 0 ? montarCampos(displayData[0], modo).map(c => c.label) : [];

    // No KPI de reentrada, Região/Fornecedor Cirurgia têm conteúdo curto e
    // sobrava espaço vazio entre as duas colunas, enquanto o nome do paciente
    // quebrava em duas linhas por falta de espaço — larguras fixas resolvem
    // as duas coisas de uma vez (Paciente, Data Cirurgia, Região, Fornecedor
    // Cirurgia, Hospital, Ações).
    const larguraColunas = kpiType === 'reentrada'
        ? ['40%', '14%', '8%', '14%', '16%', '8%']
        : null;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                    {title || "Registros Recentes"}
                </h3>
                {onClearFilter && (
                    <button
                        onClick={onClearFilter}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                        Limpar Filtro
                    </button>
                )}
            </div>

            {error && <p className="text-red-500 mb-4">{error}</p>}

            {isFetching ? (
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : displayData.length > 0 ? (
                <>
                    <table className={`w-full text-left hidden md:table ${larguraColunas ? 'table-fixed' : ''}`}>
                        {larguraColunas && (
                            <colgroup>
                                {larguraColunas.map((largura, i) => (
                                    <col key={i} style={{ width: largura }} />
                                ))}
                            </colgroup>
                        )}
                        <thead>
                            <tr className="border-b">
                                <th className="p-3 font-semibold text-sm">Paciente</th>
                                {colunas.map((label, i) => (
                                    <th key={i} className="p-3 font-semibold text-sm">{label}</th>
                                ))}
                                <th className="p-3 font-semibold text-sm">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.map((item, index) => (
                                <RegistroRowDesktop
                                    key={item.cpf || index}
                                    item={item}
                                    campos={montarCampos(item, modo)}
                                    onViewDetails={onViewDetails}
                                    onEdit={onEdit}
                                />
                            ))}
                        </tbody>
                    </table>

                    <div className="md:hidden">
                        {displayData.map((item, index) => (
                            <RegistroCardMobile
                                key={item.cpf || index}
                                item={item}
                                campos={montarCampos(item, modo)}
                                onViewDetails={onViewDetails}
                                onEdit={onEdit}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <p className="text-center text-gray-500 p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    Nenhum registro encontrado.
                </p>
            )}
        </div>
    );
}
