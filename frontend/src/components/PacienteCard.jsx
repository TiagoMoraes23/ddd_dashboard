import React, { useState } from 'react';
import { IconUser, IconIdCard, IconPhone, IconShield, IconBriefcase, IconCalendar, IconClipboard, IconStethoscope } from './CardIcons';
import { IconX } from './Icons';
import { CORES_STATUS_CIRURGIA as statusColors } from '../constants/statusCirurgia';

const InfoItem = ({ icon, label, value, valueClassName = '' }) => (
    <div className="flex items-start">
        <div className="text-blue-500 mt-1 mr-3">{icon}</div>
        <div>
            <p className="text-sm font-semibold text-gray-500">{label}</p>
            <p className={`text-gray-800 ${valueClassName}`}>{value || 'Não informado'}</p>
        </div>
    </div>
);

// Mesma regra de negócio de Paciente.isRnmVencida() no backend: vencida se
// não houver dataRnm cadastrada, ou se já passaram mais de 12 meses dela.
function isRnmVencida(dataRnm) {
    if (!dataRnm) return true;
    const dataValidade = new Date(dataRnm);
    dataValidade.setMonth(dataValidade.getMonth() + 12);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataValidade.setHours(0, 0, 0, 0);
    return hoje > dataValidade;
}

// Componente interno para item de cirurgia mobile (Expansível)
const MobileSurgeryItem = ({ cirurgia, formatarData, statusColors }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-gray-200 rounded-lg mb-3 bg-gray-50 overflow-hidden">
            {/* Cabeçalho do Card (Sempre visível) */}
            <div 
                className="p-3 flex justify-between items-center cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800">{formatarData(cirurgia.data)}</span>
                    <span className="text-sm text-gray-600">{cirurgia.fornecedor || ' '}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[cirurgia.status] || 'bg-gray-100 text-gray-800'}`}>
                        {cirurgia.status}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {/* Detalhes (Expansível) */}
            {isOpen && (
                <div className="p-3 border-t border-gray-200 text-sm space-y-2 bg-gray-50 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                        <div><span className="font-semibold text-gray-600 block">Horário:</span> {cirurgia.horario || ' '}</div>
                        <div><span className="font-semibold text-gray-600 block">Hospital:</span> {cirurgia.hospital || ' '}</div>
                    </div>
                    <div><span className="font-semibold text-gray-600 block">Região:</span> <span className="whitespace-pre-wrap">{Array.isArray(cirurgia.regiao) ? cirurgia.regiao.join('\n') : (cirurgia.regiao || ' ')}</span></div>
                    <div><span className="font-semibold text-gray-600 block">OPME:</span> <span className="whitespace-pre-wrap">{cirurgia.opme || ' '}</span></div>
                    <div><span className="font-semibold text-gray-600 block">Observações:</span> <span className="whitespace-pre-wrap">{cirurgia.descricao || ' '}</span></div>
                </div>
            )}
        </div>
    );
};

export default function PacienteCard({ paciente, onDelete, onEdit, isModal = false, onClose }) {
    const [isObservacoesExpanded, setIsObservacoesExpanded] = useState(false);
    
    const formatarData = (dataISO) => {
        if (!dataISO) return " ";
        const data = new Date(dataISO);
        if (isNaN(data.getTime())) return " ";
        const dataLocal = new Date(data.valueOf() + data.getTimezoneOffset() * 60000);
        return dataLocal.toLocaleDateString('pt-BR');
    };

    const observacoes = paciente.observacoes || 'Não informado';
    const needsTruncation = observacoes.length > 200; // Limite de caracteres para ativar o "Exibir mais"

    // Ordena as cirurgias da mais recente para a mais antiga
    const sortedCirurgias = [...(paciente.cirurgias || [])].sort((a, b) => {
        const dateA = a.data ? new Date(a.data).getTime() : 0;
        const dateB = b.data ? new Date(b.data).getTime() : 0;
        // Ordenação decrescente (mais recente primeiro)
        return dateB - dateA;
    });

    return (
        <div className={`bg-white rounded-lg ${isModal ? '' : 'shadow-md border border-gray-200 mb-4'}`}>
            {/* Cabeçalho */}
            <div className="bg-gray-50 p-4 rounded-t-lg border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
                <h3 className="text-xl font-bold text-gray-800 flex items-center pr-8 sm:pr-0 w-full sm:w-auto">
                    <div className="flex-shrink-0"><IconUser /></div>
                    <span className="ml-2 break-words">{paciente.nome}</span>
                </h3>

                {/* Botão de fechar mobile */}
                {isModal && onClose && (
                    <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 sm:hidden p-1" aria-label="Fechar">
                        <IconX />
                    </button>
                )}

                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => onEdit(paciente)} className="flex-1 sm:flex-none justify-center bg-gray-200 hover:bg-gray-300 text-black font-semibold py-2 sm:py-1 px-3 rounded-md text-sm transition-colors active:scale-95">Editar</button>
                    <button onClick={() => onDelete(paciente._id)} className="flex-1 sm:flex-none justify-center bg-red-500 hover:bg-red-600 text-white font-semibold py-2 sm:py-1 px-3 rounded-md text-sm transition-colors active:scale-95">Apagar</button>
                </div>
            </div>

            {/* Corpo com Detalhes */}
            <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <InfoItem icon={<IconIdCard />} label="CPF" value={paciente.cpf} />
                    <InfoItem icon={<IconPhone />} label="Contato" value={paciente.contato} />
                    <InfoItem icon={<IconShield />} label="Convênio" value={paciente.convenio} />
                    <InfoItem icon={<IconBriefcase />} label="Fornecedor Atual" value={Array.isArray(paciente.fornecedor) ? paciente.fornecedor.join(', ') : paciente.fornecedor} />
                    <InfoItem
                        icon={<IconCalendar />}
                        label="Data RNM"
                        value={formatarData(paciente.dataRnm)}
                        valueClassName={isRnmVencida(paciente.dataRnm) ? 'text-red-600 font-semibold' : ''}
                    />
                </div>

                {/* Seção de Últimos Fornecedores (full-width) */}
                <div className="mt-6">
                    <div className="flex items-start">
                        <div className="text-blue-500 mt-1 mr-3 flex-shrink-0"><IconBriefcase /></div>
                        <div>
                            <p className="text-sm font-semibold text-gray-500">Últimos Fornecedores</p>
                            <p className="text-gray-800 break-words">
                                {paciente.ultimosFornecedores?.length > 0
                                    ? paciente.ultimosFornecedores
                                        .map((uf) => uf.data ? `${uf.fornecedor} (${formatarData(uf.data)})` : uf.fornecedor)
                                        .join(', ')
                                    : 'Não informado'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Seção de Observações (full-width) */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-start">
                        <div className="text-blue-500 mt-1 mr-3 flex-shrink-0"><IconClipboard /></div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-500">Observações</p>
                            <p className={`text-gray-800 break-words whitespace-pre-line ${needsTruncation && !isObservacoesExpanded ? 'line-clamp-4' : ''}`}>
                                {observacoes}
                            </p>
                            {needsTruncation && (
                                <button onClick={() => setIsObservacoesExpanded(!isObservacoesExpanded)} className="text-blue-600 hover:underline text-sm font-semibold mt-2">
                                    {isObservacoesExpanded ? 'Exibir menos' : 'Exibir mais'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Seção de Cirurgias */}
                <div className="mt-6">
                    <h4 className="text-lg font-bold text-gray-700 mb-3 flex items-center">
                        <IconStethoscope />
                        <span className="ml-2">Histórico de Cirurgias</span>
                    </h4>
                    {sortedCirurgias.length > 0 ? (
                        <>
                        {/* Visualização Mobile (Lista de Cards Expansíveis) */}
                        <div className="block md:hidden">
                            {sortedCirurgias.map((cirurgia, index) => (
                                <MobileSurgeryItem key={index} cirurgia={cirurgia} formatarData={formatarData} statusColors={statusColors} />
                            ))}
                        </div>

                        {/* Visualização Desktop (Tabela Completa) */}
                        <div className="hidden md:block overflow-x-auto border rounded-lg">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50">
                                    <tr className="border-b">
                                        <th className="p-3 font-semibold text-sm">Status</th>
                                        <th className="p-3 font-semibold text-sm">Data</th>
                                        <th className="p-3 font-semibold text-sm">Hospital</th>
                                        <th className="p-3 font-semibold text-sm">Região</th>
                                        <th className="p-3 font-semibold text-sm">Fornecedor</th>
                                        <th className="p-3 font-semibold text-sm">OPME</th>
                                        <th className="p-3 font-semibold text-sm">Observações</th>
                                        <th className="p-3 font-semibold text-sm">Horário</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedCirurgias.map((cirurgia, index) => (
                                        <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                                            <td className="p-2">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[cirurgia.status] || 'bg-gray-100 text-gray-800'}`}>
                                                    {cirurgia.status}
                                                </span>
                                            </td>
                                            <td className="p-2 text-gray-600">{formatarData(cirurgia.data)}</td>
                                            <td className="p-2 text-gray-600">{cirurgia.hospital || ' '}</td>
                                            <td className="p-2 text-gray-600"><div className="max-w-[8ch] break-words leading-tight whitespace-pre-wrap">{Array.isArray(cirurgia.regiao) ? cirurgia.regiao.join('\n') : (cirurgia.regiao || ' ')}</div></td>
                                            <td className="p-2 text-gray-600">{cirurgia.fornecedor || ' '}</td>
                                            <td className="p-3 text-gray-700 text-sm max-w-[150px] truncate" title={cirurgia.opme}>{cirurgia.opme || ' '}</td>
                                            <td className="p-3 text-gray-700">{cirurgia.descricao || ' '}</td>
                                            <td className="p-2 text-gray-600">{cirurgia.horario || ' '}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        </>
                    ) : (
                        <div className="text-center text-gray-500 p-4 bg-gray-50 rounded-md">
                            Nenhuma cirurgia registrada para este paciente.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}