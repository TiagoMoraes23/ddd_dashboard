import { useState } from 'react';

export default function FilterPanel({ onSearch, onClear, isLoading }) {
    const [fornecedor, setFornecedor] = useState('');
    const [sortBy, setSortBy] = useState('padrão');
    // Novo estado para um filtro de data mais robusto
    const [tipoData, setTipoData] = useState('mes'); // 'mes', 'dia', 'ano'
    const [dataValor, setDataValor] = useState('');

    const handleSearch = () => {
        const filtros = {};
        if (fornecedor) filtros.fornecedor = fornecedor;
        if (sortBy !== 'padrão') filtros.sortBy = sortBy;

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
        setSortBy('padrão');
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
        switch (tipoData) {
            case 'dia':
                return <input type="date" value={dataValor} onChange={(e) => setDataValor(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" disabled={isLoading} />;
            case 'ano':
                return <input type="number" placeholder="Ex: 2024" value={dataValor} onChange={(e) => setDataValor(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" disabled={isLoading} />;
            case 'mes':
            default:
                return <input type="text" placeholder="mm/aaaa" value={dataValor} onChange={handleMesAnoChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" disabled={isLoading} maxLength="7" />;
        }
    };

    return (
        <div className="p-4 bg-gray-100 border rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div>
                    <label htmlFor="fornecedor" className="block text-sm font-medium text-gray-700">Fornecedor</label>
                    <input type="text" id="fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Nome do fornecedor" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" disabled={isLoading} />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Data da Cirurgia</label>
                    <div className="flex space-x-2">
                        <select value={tipoData} onChange={(e) => { setTipoData(e.target.value); setDataValor(''); }} className="mt-1 block w-1/2 border border-gray-300 rounded-md shadow-sm p-2" disabled={isLoading}>
                            <option value="mes">Mês/Ano</option>
                            <option value="dia">Dia</option>
                            <option value="ano">Ano</option>
                        </select>
                        <div className="w-1/2">
                            {renderDateInput()}
                        </div>
                    </div>
                </div>
                <div>
                    <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700">Ordenar por</label>
                    <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" disabled={isLoading}>
                        <option value="padrão">Mais Recentes</option>
                        <option value="data_asc">Data (Crescente)</option>
                        <option value="data_desc">Data (Decrescente)</option>
                    </select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                     <button onClick={handleSearch} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg" disabled={isLoading}>
                        Buscar
                    </button>
                    <button onClick={handleClear} className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg" disabled={isLoading}>
                        Limpar
                    </button>
                </div>
            </div>
        </div>
    );
}