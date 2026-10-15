import { useState, useEffect } from "react";

export default function PacienteForm({ onSubmit, pacienteParaEditar, onCancel }) {
    const estadoInicial = { 
        cpf: "", nome: "", convenio: "", fornecedor: "", ultimosFornecedores: "", 
        cirurgias: [{ descricao: '', data: '', horario: '', opme: '', fornecedor: '', hospital: '', regiao: '', status: 'Autorizado' }], 
        contato: "", observacoes: "", linkArquivos: "", dataRnm: "" 
    };
    const [form, setForm] = useState(estadoInicial);
    
    useEffect(() => {
        if (pacienteParaEditar) {
            const cirurgiasEdit = pacienteParaEditar.cirurgias?.map(c => ({
                descricao: c.descricao || '',
                data: c.data ? new Date(c.data).toISOString().split('T')[0] : '',
                horario: c.horario || '',
                opme: c.opme || '',
                fornecedor: c.fornecedor || '',
                hospital: c.hospital || '',
                regiao: c.regiao || '',
                status: c.status || 'Autorizado'
            })) || [];

            setForm({
                cpf: pacienteParaEditar.cpf || "", nome: pacienteParaEditar.nome || "", convenio: pacienteParaEditar.convenio || "",
                fornecedor: pacienteParaEditar.fornecedor || "", ultimosFornecedores: pacienteParaEditar.ultimosFornecedores?.join(', ') || "",
                cirurgias: cirurgiasEdit.length > 0 ? cirurgiasEdit : [{ descricao: '', data: '', horario: '', opme: '', fornecedor: '', hospital: '', regiao: '', status: 'Autorizado' }],
                contato: pacienteParaEditar.contato || "",
                observacoes: pacienteParaEditar.observacoes || "", linkArquivos: pacienteParaEditar.linkArquivos || "",
                dataRnm: pacienteParaEditar.dataRnm ? new Date(pacienteParaEditar.dataRnm).toISOString().split('T')[0] : ""
            });
        } else {
            setForm(estadoInicial);
        }
    }, [pacienteParaEditar]);

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function handleCirurgiaChange(index, e) {
        const novasCirurgias = [...form.cirurgias];
        novasCirurgias[index][e.target.name] = e.target.value;
        setForm({ ...form, cirurgias: novasCirurgias });
    }

    function adicionarCirurgia() {
        setForm(prevForm => ({
            ...prevForm,
            cirurgias: [...prevForm.cirurgias, { descricao: '', data: '', horario: '', opme: '', fornecedor: '', hospital: '', regiao: '', status: 'Autorizado' }]
        }));
    }

    function removerCirurgia(index) {
        if (form.cirurgias.length <= 1) return;
        if (window.confirm("Tem certeza que deseja apagar este registro de cirurgia?")) {
            const novasCirurgias = form.cirurgias.filter((_, i) => i !== index);
            setForm({ ...form, cirurgias: novasCirurgias });
        }
    }

    function handleSubmit(e) {
        e.preventDefault();

        const validarAnoCompleto = (dataString) => {
            if (!dataString) return true;
            const ano = parseInt(dataString.split('-')[0], 10);
            return !isNaN(ano) && ano > 999;
        };

        if (!validarAnoCompleto(form.dataRnm) || form.cirurgias.some(c => !validarAnoCompleto(c.data))) {
            alert('Data inválida. Por favor, preencha o ano com 4 dígitos (ex: 2024).');
            return;
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const limiteAgendamento = new Date(hoje);
        limiteAgendamento.setMonth(limiteAgendamento.getMonth() + 2);

        for (let i = 0; i < form.cirurgias.length; i++) {
            const cirurgia = form.cirurgias[i];
            if (cirurgia.data && cirurgia.status) {
                const [ano, mes, dia] = cirurgia.data.split('-').map(Number);
                const dataCirurgia = new Date(ano, mes - 1, dia);

                if (cirurgia.status === 'Agendado') {
                    if (dataCirurgia > limiteAgendamento) {
                        alert(`Atenção na cirurgia #${i + 1}: Para status "Agendado".\n\nData inserida: ${cirurgia.data.split('-').reverse().join('/')}\nLimite permitido: ${limiteAgendamento.toLocaleDateString('pt-BR')}\n\nVerifique os dados digitados novamente`);
                        return;
                    }
                }

                if (cirurgia.status === 'Realizado') {
                    if (dataCirurgia > hoje) {
                        alert(`Atenção na cirurgia #${i + 1}: Para status "Realizado", a data não pode ser futura.\n\nData inserida: ${cirurgia.data.split('-').reverse().join('/')}\nHoje: ${hoje.toLocaleDateString('pt-BR')}`);
                        return;
                    }
                }
            }
        }

        const paciente = {
            ...form,
            ultimosFornecedores: form.ultimosFornecedores ? form.ultimosFornecedores.split(",").map(f => f.trim()) : [],
            cirurgias: form.cirurgias
                .map(c => ({ ...c, data: c.data || null }))
                .filter(c =>
                    (c.descricao && c.descricao.trim() !== '') ||
                    c.data ||
                    (c.fornecedor && c.fornecedor.trim() !== '') ||
                    (c.hospital && c.hospital.trim() !== '') ||
                    (c.regiao && c.regiao.trim() !== '')
                ),
            dataRnm: form.dataRnm || null
        };
        onSubmit(paciente);
    }

    const modoEdicao = !!pacienteParaEditar;

    return (
        <form onSubmit={handleSubmit} className="p-6 border rounded-lg bg-white shadow-sm mb-8">
            <h2 className="font-bold text-xl mb-4 text-gray-800">{modoEdicao ? "Editar Paciente" : "Cadastrar Novo Paciente"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="cpf" placeholder="CPF (somente números)" value={form.cpf} onChange={handleChange} disabled={modoEdicao} className="border p-2 rounded w-full disabled:bg-gray-200" required />
                <input name="nome" placeholder="Nome Completo" value={form.nome} onChange={handleChange} className="border p-2 rounded w-full" required />
                <input name="convenio" placeholder="Convênio" value={form.convenio} onChange={handleChange} className="border p-2 rounded w-full" />
                <input name="fornecedor" placeholder="Fornecedor" value={form.fornecedor} onChange={handleChange} className="border p-2 rounded w-full" />
                <input name="contato" placeholder="Contato (Telefone)" value={form.contato} onChange={handleChange} className="border p-2 rounded w-full" />
                <div className="flex items-center"><label htmlFor="dataRnm" className="text-sm text-gray-600 mr-2">Data RNM:</label><input id="dataRnm" type="date" name="dataRnm" value={form.dataRnm} onChange={handleChange} className="border p-2 rounded w-full" /></div>
                <input name="ultimosFornecedores" placeholder="Últimos Fornecedores (separados por vírgula)" value={form.ultimosFornecedores} onChange={handleChange} className="border p-2 rounded w-full md:col-span-2" />
                
                <div className="md:col-span-2 space-y-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg text-gray-700">Cirurgias</h3>
                        <button type="button" onClick={adicionarCirurgia} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-md text-sm">
                            + Adicionar Cirurgia
                        </button>
                    </div>
                    {form.cirurgias.map((cirurgia, index) => (
                        <div key={index} className="p-4 border rounded-md bg-gray-50 relative grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input name="fornecedor" placeholder="Fornecedor da Cirurgia" value={cirurgia.fornecedor} onChange={(e) => handleCirurgiaChange(index, e)} className="border p-2 rounded w-full" />
                            <input name="hospital" placeholder="Hospital" value={cirurgia.hospital} onChange={(e) => handleCirurgiaChange(index, e)} className="border p-2 rounded w-full" />
                            <input name="regiao" placeholder="Região" value={cirurgia.regiao} onChange={(e) => handleCirurgiaChange(index, e)} className="border p-2 rounded w-full" />
                            <select name="status" value={cirurgia.status} onChange={(e) => handleCirurgiaChange(index, e)} className="border p-2 rounded w-full">
                                <option value="Autorizado">Autorizado</option>
                                <option value="Agendado">Agendado</option>
                                <option value="Realizado">Realizado</option>
                                <option value="Agendamento Pendente">Agendamento Pendente</option>
                                <option value="Senha expirada">Senha expirada</option>
                                <option value="Cancelado (outro motivo)">Cancelado (outro motivo)</option>
                            </select>
                            
                            <div className="flex items-center">
                                <label htmlFor={`cirurgia-data-${index}`} className="text-sm text-gray-600 mr-2 whitespace-nowrap">Data:</label>
                                <input id={`cirurgia-data-${index}`} type="date" name="data" value={cirurgia.data} onChange={(e) => handleCirurgiaChange(index, e)} className="border p-2 rounded w-full" />
                            </div>
                            <div className="flex items-center">
                                <label htmlFor={`cirurgia-horario-${index}`} className="text-sm text-gray-600 mr-2 whitespace-nowrap">Horário:</label>
                                <input id={`cirurgia-horario-${index}`} type="time" name="horario" value={cirurgia.horario} onChange={(e) => handleCirurgiaChange(index, e)} className="border p-2 rounded w-full" />
                            </div>
                            <textarea name="opme" placeholder="OPME (Materiais)" value={cirurgia.opme} onChange={(e) => handleCirurgiaChange(index, e)} className="border p-2 rounded w-full md:col-span-2" rows="2" />
                            <input name="descricao" placeholder="Observação da Cirurgia" value={cirurgia.descricao} onChange={(e) => handleCirurgiaChange(index, e)} className="border p-2 rounded w-full md:col-span-2"  />
                            {form.cirurgias.length > 1 && (
                                <button type="button" onClick={() => removerCirurgia(index)} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-full text-xs">
                                    X
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <input name="linkArquivos" placeholder="Link para Arquivos (Google Drive, etc.)" value={form.linkArquivos} onChange={handleChange} className="border p-2 rounded w-full md:col-span-2" />
                <textarea name="observacoes" placeholder="Observações" value={form.observacoes} onChange={handleChange} className="border p-2 rounded w-full md:col-span-2" rows="3"></textarea>
            </div>
            <div className="mt-4 flex items-center">
                <button className={`text-white px-4 py-2 rounded-md font-semibold ${modoEdicao ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>{modoEdicao ? "Atualizar Paciente" : "Salvar Paciente"}</button>
                {onCancel && (<button type="button" onClick={onCancel} className="ml-3 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-semibold">Cancelar</button>)}
            </div>
        </form>
    );
}