import { useState } from 'react';
import { IconSearch, IconTrash } from './Icons';

export default function SurgeryFilterPanel({ onSearch, onClear, isSearching }) {
    const [fornecedor, setFornecedor] = useState('');
    const [status, setStatus] = useState('');
    const [sortBy, setSortBy] = useState('data_desc');
    const [tipoData, setTipoData] = useState('mes');
    const [dataValor, setDataValor] = useState('');

    const handleSearch = () => {
        const filtros = {};
        if (fornecedor) filtros.fornecedor = fornecedor;
        if (status) filtros.status = status;
        if (sortBy) filtros.sortBy = sortBy;

        if (dataValor) {
            let dataParaBusca = dataValor;
            if (tipoData === 'dia' && dataValor) {
                const [ano, mes, dia] = dataValor.split('-');
                dataParaBusca = `${dia}/${mes}/${ano}`;
            }
            filtros.dataCirurgia = dataParaBusca;
        }

        onSearch(filtros);
    };

    const handleClear = () => {
        setFornecedor('');
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

    const renderDateInput = () => {
        switch (tipoData) {
            case 'dia':
                return <input type="date" value={dataValor} onChange={(e) => setDataValor(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10" disabled={isSearching} />;
            case 'ano':
                return <input type="number" placeholder="Ex: 2024" value={dataValor} onChange={(e) => setDataValor(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10" disabled={isSearching} />;
            case 'mes':
            default:
                return <input type="text" placeholder="mm/aaaa" value={dataValor} onChange={handleMesAnoChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10" disabled={isSearching} maxLength="7" />;
        }
    };

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-md mb-6 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Filtro de Cirurgias</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end mb-4">
                <div className="lg:col-span-2">
                    <label htmlFor="fornecedor" className="block text-sm font-medium text-gray-700">Fornecedor</label>
                    <input type="text" id="fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome fornecedor" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10" disabled={isSearching} />
                </div>
                <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Data da Cirurgia</label>
                    <div className="flex space-x-2">
                        <select value={tipoData} onChange={(e) => { setTipoData(e.target.value); setDataValor(''); }} className="mt-1 block w-2/5 border border-gray-300 rounded-md shadow-sm p-2 h-10" disabled={isSearching}><option value="mes">Mês/Ano</option><option value="dia">Dia</option><option value="ano">Ano</option></select>
                        <div className="w-3/5">{renderDateInput()}</div>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10" disabled={isSearching}>
                        <option value="">Todos</option>
                        <option value="Autorizado">Autorizado</option>
                        <option value="Agendado">Agendado</option>
                        <option value="Realizado">Realizado</option>
                        <option value="Agendamento Pendente">Agendamento Pendente</option>
                        <option value="Senha expirada">Senha expirada</option>
                        <option value="Cancelado (outro motivo)">Cancelado (outro motivo)</option>
                    </select>
                </div>
                <div className="lg:col-span-1">
                    <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700">Ordenar por</label>
                    <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-10" disabled={isSearching}>
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
