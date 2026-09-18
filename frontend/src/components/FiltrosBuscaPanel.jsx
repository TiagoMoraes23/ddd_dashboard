import { useState } from 'react';
import { IconSearch, IconTrash } from './Icons';
import { STATUS_CIRURGIA } from '../constants/statusCirurgia';

// Unifica os antigos PatientFilterPanel + SurgeryFilterPanel num só painel com
// busca/limpar únicos — antes o usuário precisava clicar em dois botões
// separados para combinar os parâmetros de paciente e de cirurgia na mesma busca.
export default function FiltrosBuscaPanel({ onSearch, onClear, isSearching }) {
    const [fornecedorAtual, setFornecedorAtual] = useState('');
    const [convenio, setConvenio] = useState('');
    const [fornecedorCirurgia, setFornecedorCirurgia] = useState('');
    const [status, setStatus] = useState('');
    const [sortBy, setSortBy] = useState('data_desc');
    const [tipoData, setTipoData] = useState('mes'); // 'mes', 'dia', 'ano'
    const [dataValor, setDataValor] = useState('');

    // Valor especial de "status": não é um status de cirurgia real (StatusCirurgia
    // não aceita isso), é um filtro estrutural de ausência de cirurgia — por isso
    // fica fora de STATUS_CIRURGIA e é tratado à parte aqui, nunca indo pro
    // enum de domínio.
    const SEM_CIRURGIAS = 'SEM_CIRURGIAS';
    const semCirurgiasAtivo = status === SEM_CIRURGIAS;

    const handleStatusChange = (e) => {
        const novoStatus = e.target.value;
        setStatus(novoStatus);
        // "Sem cirurgias" não combina com nenhum outro parâmetro de cirurgia —
        // limpa pra não deixar valor preenchido mas inativo/enganoso na UI.
        if (novoStatus === SEM_CIRURGIAS) {
            setFornecedorCirurgia('');
            setSortBy('data_desc');
            setTipoData('mes');
            setDataValor('');
        }
    };

    const handleSearch = () => {
        const filtrosPaciente = {};
        if (fornecedorAtual) filtrosPaciente.fornecedor = fornecedorAtual;
        if (convenio) filtrosPaciente.convenio = convenio;

        const filtrosCirurgia = {};

        if (semCirurgiasAtivo) {
            // Filtro estrutural do paciente (ausência de cirurgia), não da cirurgia
            // em si — vai pro mesmo endpoint de fornecedor atual/convênio.
            filtrosPaciente.semCirurgias = true;
        } else {
            if (fornecedorCirurgia) filtrosCirurgia.fornecedor = fornecedorCirurgia;
            if (status) filtrosCirurgia.status = status;
            if (sortBy) filtrosCirurgia.sortBy = sortBy;

            if (dataValor) {
                let dataParaBusca = dataValor;
                if (tipoData === 'dia') {
                    const [ano, mes, dia] = dataValor.split('-');
                    dataParaBusca = `${dia}/${mes}/${ano}`;
                }
                filtrosCirurgia.dataCirurgia = dataParaBusca;
            }
        }

        onSearch({ filtrosPaciente, filtrosCirurgia });
    };

    const handleClear = () => {
        setFornecedorAtual('');
        setConvenio('');
        setFornecedorCirurgia('');
        setStatus('');
        setSortBy('data_desc');
        setTipoData('mes');
        setDataValor('');
        onClear();
    };

    const handleMesAnoChange = (e) => {
        const numeros = e.target.value.replace(/\D/g, '');
        let valorFormatado = numeros;

        if (numeros.length > 2) {
            valorFormatado = `${numeros.slice(0, 2)}/${numeros.slice(2, 6)}`;
        }

        setDataValor(valorFormatado);
    };

    // Renderiza o input de data correto com base na seleção do utilizador
    const renderDateInput = () => {
        const disabled = isSearching || semCirurgiasAtivo;
        switch (tipoData) {
            case 'dia':
                return <input type="date" value={dataValor} onChange={(e) => setDataValor(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10 disabled:bg-gray-100 disabled:cursor-not-allowed" disabled={disabled} />;
            case 'ano':
                return <input type="number" placeholder="Ex: 2024" value={dataValor} onChange={(e) => setDataValor(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10 disabled:bg-gray-100 disabled:cursor-not-allowed" disabled={disabled} />;
            case 'mes':
            default:
                return <input type="text" placeholder="mm/aaaa" value={dataValor} onChange={handleMesAnoChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10 disabled:bg-gray-100 disabled:cursor-not-allowed" disabled={disabled} maxLength="7" />;
        }
    };

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-md mb-6 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Filtros de Busca</h3>

            {/* Fornecedor atual + convênio: campos do paciente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label htmlFor="fornecedorAtual" className="block text-sm font-medium text-gray-700">Fornecedor Atual</label>
                    <input type="text" id="fornecedorAtual" value={fornecedorAtual} onChange={(e) => setFornecedorAtual(e.target.value)} placeholder="Fornecedor atual do paciente" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10" disabled={isSearching} />
                </div>
                <div>
                    <label htmlFor="convenio" className="block text-sm font-medium text-gray-700">Convênio</label>
                    <input type="text" id="convenio" value={convenio} onChange={(e) => setConvenio(e.target.value)} placeholder="Nome do convênio" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10" disabled={isSearching} />
                </div>
            </div>

            {/* Demais parâmetros: campos da cirurgia */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end mb-4 pt-4 border-t border-gray-100">
                <div className="lg:col-span-2">
                    <label htmlFor="fornecedorCirurgia" className="block text-sm font-medium text-gray-700">Fornecedor (Cirurgia)</label>
                    <input type="text" id="fornecedorCirurgia" value={fornecedorCirurgia} onChange={(e) => setFornecedorCirurgia(e.target.value)} placeholder="Nome fornecedor" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10 disabled:bg-gray-100 disabled:cursor-not-allowed" disabled={isSearching || semCirurgiasAtivo} />
                </div>
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Data da Cirurgia</label>
                    <div className="flex space-x-2">
                        <select value={tipoData} onChange={(e) => { setTipoData(e.target.value); setDataValor(''); }} className="mt-1 block w-2/5 border border-gray-300 rounded-md shadow-sm p-2 h-10 disabled:bg-gray-100 disabled:cursor-not-allowed" disabled={isSearching || semCirurgiasAtivo}><option value="mes">Mês/Ano</option><option value="dia">Dia</option><option value="ano">Ano</option></select>
                        <div className="w-3/5">{renderDateInput()}</div>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select id="status" value={status} onChange={handleStatusChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10" disabled={isSearching}>
                        <option value="">Todos</option>
                        {STATUS_CIRURGIA.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                        <option value={SEM_CIRURGIAS}>Sem cirurgias</option>
                    </select>
                </div>
                <div className="lg:col-span-1">
                    <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700">Ordenar por</label>
                    <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10 disabled:bg-gray-100 disabled:cursor-not-allowed" disabled={isSearching || semCirurgiasAtivo}>
                        <option value="data_desc">Mais Recente</option>
                        <option value="data_asc">Mais Antiga</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-center items-center gap-4 pt-4 border-t border-gray-200">
                <button onClick={handleSearch} className="w-full md:w-auto min-w-[180px] flex justify-center items-center gap-2 text-center bg-transparent hover:shadow-md text-blue-600 font-bold py-2 px-6 rounded-lg border border-blue-600 transition-all duration-200" disabled={isSearching}>
                    <IconSearch />
                    {isSearching ? 'Buscando...' : 'Buscar'}
                </button>
                <button onClick={handleClear} className="w-full md:w-auto min-w-[180px] flex justify-center items-center gap-2 text-center bg-transparent hover:shadow-md text-red-500 font-semibold py-2 px-6 rounded-lg border border-red-500 transition-all duration-200" disabled={isSearching}>
                    <IconTrash />
                    Limpar
                </button>
            </div>
        </div>
    );
}
