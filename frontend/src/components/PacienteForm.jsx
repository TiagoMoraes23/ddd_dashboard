import { useState, useEffect, useRef } from "react";
import { STATUS_CIRURGIA } from '../constants/statusCirurgia';
import { IconRepeat } from './Icons';

const REGIOES_CIRURGIA = ['Coluna', 'Ombro', 'Cotovelo', 'Punho', 'Mão', 'Quadril', 'Joelho', 'Tornozelo', 'Pé'];

function formatarDataHoje() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${hoje.getFullYear()}`;
}

// Mesmo dia de hoje, mas no formato aceito por <input type="date"> (yyyy-mm-dd).
function dataHojeISO() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// Cria ou atualiza, em `ultimosFornecedores`, a entrada ligada a uma linha de
// "Fornecedor Atual" (identificada por `chave`, estável mesmo se outras linhas
// forem adicionadas/removidas) — se a entrada ainda não existe, cria uma nova
// já com a data de hoje; se já existe (mesma `chave`), só atualiza o nome,
// preservando a data que já estava lá (inclusive se o usuário já a editou).
function sincronizarUltimoFornecedor(ultimosFornecedores, chave, nome) {
    const indiceExistente = ultimosFornecedores.findIndex((uf) => uf._fornecedorAtualChave === chave);

    if (indiceExistente >= 0) {
        const novaLista = [...ultimosFornecedores];
        novaLista[indiceExistente] = { ...novaLista[indiceExistente], fornecedor: nome };
        return novaLista;
    }

    if (!nome.trim()) return ultimosFornecedores;

    return [{ fornecedor: nome, data: dataHojeISO(), _fornecedorAtualChave: chave }, ...ultimosFornecedores];
}

export default function PacienteForm({ onSubmit, pacienteParaEditar, onCancel }) {
    const cirurgiaVazia = () => ({ descricao: '', data: '', horario: '', opme: '', fornecedor: '', hospital: '', regiao: [], status: 'Autorizado' });
    const estadoInicial = {
        cpf: "", nome: "", convenio: "", fornecedor: [], ultimosFornecedores: [],
        cirurgias: [cirurgiaVazia()],
        cirurgiasRemovidas: [], // _ids de cirurgias já persistidas que o usuário apagou nesta sessão de edição
        contato: "", observacoes: "", linkArquivos: "", dataRnm: ""
    };
    const [form, setForm] = useState(estadoInicial);
    const cirurgiaRefs = useRef([]);

    useEffect(() => {
        if (pacienteParaEditar) {
            const cirurgiasEdit = pacienteParaEditar.cirurgias?.map(c => ({
                _id: c._id, // presente = cirurgia já persistida na coleção standalone; ausente = linha nova
                descricao: c.descricao || '',
                data: c.data ? new Date(c.data).toISOString().split('T')[0] : '',
                horario: c.horario || '',
                opme: c.opme || '',
                fornecedor: c.fornecedor || '',
                hospital: c.hospital || '',
                regiao: Array.isArray(c.regiao) ? c.regiao : (c.regiao ? [c.regiao] : []),
                status: c.status || 'Autorizado'
            })) || [];

            // Do mais recente para o mais antigo; entradas sem data ficam por último.
            const ultimosFornecedoresEdit = [...(pacienteParaEditar.ultimosFornecedores || [])]
                .sort((a, b) => {
                    if (!a.data && !b.data) return 0;
                    if (!a.data) return 1;
                    if (!b.data) return -1;
                    return new Date(b.data) - new Date(a.data);
                })
                .map(uf => ({
                    fornecedor: uf.fornecedor || '',
                    data: uf.data ? new Date(uf.data).toISOString().split('T')[0] : '',
                }));

            // Defensivo: aceita tanto o formato novo (array) quanto, por segurança,
            // um eventual documento ainda não migrado (string única). Cada linha
            // recebe uma chave estável (só no cliente) para poder ser ligada a uma
            // entrada de "Últimos Fornecedores" via sincronizarUltimoFornecedor.
            const fornecedorEdit = (Array.isArray(pacienteParaEditar.fornecedor)
                ? pacienteParaEditar.fornecedor
                : (pacienteParaEditar.fornecedor ? [pacienteParaEditar.fornecedor] : [])
            ).map((nome) => ({ chave: crypto.randomUUID(), nome }));

            setForm({
                cpf: pacienteParaEditar.cpf || "", nome: pacienteParaEditar.nome || "", convenio: pacienteParaEditar.convenio || "",
                fornecedor: fornecedorEdit, ultimosFornecedores: ultimosFornecedoresEdit,
                cirurgias: cirurgiasEdit.length > 0 ? cirurgiasEdit : [cirurgiaVazia()],
                cirurgiasRemovidas: [],
                contato: pacienteParaEditar.contato || "",
                observacoes: pacienteParaEditar.observacoes || "", linkArquivos: pacienteParaEditar.linkArquivos || "",
                dataRnm: pacienteParaEditar.dataRnm ? new Date(pacienteParaEditar.dataRnm).toISOString().split('T')[0] : ""
            });
        } else {
            setForm(estadoInicial);
        }
    }, [pacienteParaEditar]);

    function handleChange(e) {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    }

    // Ao digitar (a cada tecla, não só ao sair do campo), reflete o mesmo nome
    // ao vivo na entrada ligada de "Últimos Fornecedores" — criando-a com a
    // data de hoje na primeira letra digitada, e só atualizando o nome dela
    // (sem mexer na data) nas teclas seguintes.
    function handleFornecedorAtualChange(index, e) {
        const novoNome = e.target.value;
        setForm(prevForm => {
            const novaListaFornecedor = [...prevForm.fornecedor];
            const chave = novaListaFornecedor[index].chave;
            novaListaFornecedor[index] = { ...novaListaFornecedor[index], nome: novoNome };

            return {
                ...prevForm,
                fornecedor: novaListaFornecedor,
                ultimosFornecedores: sincronizarUltimoFornecedor(prevForm.ultimosFornecedores, chave, novoNome),
            };
        });
    }

    // Botão manual (ícone ao lado do campo): útil para linhas que já vieram
    // preenchidas ao editar um paciente existente (nunca passaram por um
    // "onChange" nesta sessão, então ainda não têm uma entrada ligada) — sem
    // ele, só reeditando o texto é que criaria/atualizaria o histórico.
    function enviarParaUltimosFornecedores(index) {
        const { chave, nome } = form.fornecedor[index];
        if (!nome.trim()) return;
        setForm(prevForm => ({
            ...prevForm,
            ultimosFornecedores: sincronizarUltimoFornecedor(prevForm.ultimosFornecedores, chave, nome),
        }));
    }

    function adicionarFornecedorAtual() {
        setForm(prevForm => ({
            ...prevForm,
            fornecedor: [...prevForm.fornecedor, { chave: crypto.randomUUID(), nome: '' }],
        }));
    }

    function removerFornecedorAtual(index) {
        setForm(prevForm => ({
            ...prevForm,
            fornecedor: prevForm.fornecedor.filter((_, i) => i !== index),
        }));
    }

    function handleUltimoFornecedorChange(index, e) {
        const novaLista = [...form.ultimosFornecedores];
        novaLista[index] = { ...novaLista[index], [e.target.name]: e.target.value };
        setForm({ ...form, ultimosFornecedores: novaLista });
    }

    function adicionarUltimoFornecedor() {
        setForm(prevForm => ({
            ...prevForm,
            ultimosFornecedores: [{ fornecedor: '', data: '' }, ...prevForm.ultimosFornecedores]
        }));
    }

    function removerUltimoFornecedor(index) {
        setForm(prevForm => ({
            ...prevForm,
            ultimosFornecedores: prevForm.ultimosFornecedores.filter((_, i) => i !== index)
        }));
    }

    function handleCirurgiaChange(index, e) {
        const novasCirurgias = [...form.cirurgias];
        novasCirurgias[index][e.target.name] = e.target.value;
        setForm({ ...form, cirurgias: novasCirurgias });
    }

    function adicionarCirurgia() {
        setForm(prevForm => ({
            ...prevForm,
            cirurgias: [...prevForm.cirurgias, cirurgiaVazia()]
        }));
        // Rola até a nova seção de cirurgia assim que ela for renderizada,
        // em vez de deixar o usuário procurar manualmente por ela no formulário.
        requestAnimationFrame(() => {
            const novoIndex = cirurgiaRefs.current.length - 1;
            cirurgiaRefs.current[novoIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    function removerCirurgia(index) {
        // Não permite remover a última linha se for a única
        if (form.cirurgias.length <= 1) return;
        if (window.confirm("Tem certeza que deseja apagar este registro de cirurgia?")) {
            const cirurgiaRemovida = form.cirurgias[index];
            const novasCirurgias = form.cirurgias.filter((_, i) => i !== index);
            setForm(prevForm => ({
                ...prevForm,
                cirurgias: novasCirurgias,
                // Só entra na lista de apagar se já existia na coleção standalone
                // (linha nunca salva não precisa de DELETE nenhum).
                cirurgiasRemovidas: cirurgiaRemovida._id
                    ? [...prevForm.cirurgiasRemovidas, cirurgiaRemovida._id]
                    : prevForm.cirurgiasRemovidas,
            }));
        }
    }

    function handleRegiaoChange(cirurgiaIndex, regiaoIndex, novoValor) {
        setForm(prevForm => {
            const novasCirurgias = [...prevForm.cirurgias];
            const novasRegioes = [...novasCirurgias[cirurgiaIndex].regiao];
            novasRegioes[regiaoIndex] = novoValor;
            novasCirurgias[cirurgiaIndex] = { ...novasCirurgias[cirurgiaIndex], regiao: novasRegioes };
            return { ...prevForm, cirurgias: novasCirurgias };
        });
    }

    function adicionarRegiao(cirurgiaIndex) {
        setForm(prevForm => {
            const novasCirurgias = [...prevForm.cirurgias];
            novasCirurgias[cirurgiaIndex] = {
                ...novasCirurgias[cirurgiaIndex],
                regiao: [...novasCirurgias[cirurgiaIndex].regiao, ''],
            };
            return { ...prevForm, cirurgias: novasCirurgias };
        });
    }

    function removerRegiao(cirurgiaIndex, regiaoIndex) {
        setForm(prevForm => {
            const novasCirurgias = [...prevForm.cirurgias];
            novasCirurgias[cirurgiaIndex] = {
                ...novasCirurgias[cirurgiaIndex],
                regiao: novasCirurgias[cirurgiaIndex].regiao.filter((_, i) => i !== regiaoIndex),
            };
            return { ...prevForm, cirurgias: novasCirurgias };
        });
    }

    function handleObservacoesKeyDown(e) {
        // Ao apertar Enter (sem Shift), já insere a data de hoje numa linha só
        // dela — Observações funciona como um log histórico do processo de
        // autorização, e é comum esquecerem de datar cada entrada manualmente.
        // Só quebra linha ANTES da data se já havia texto antes do cursor (senão
        // sobra uma linha em branco no topo); só quebra linha DEPOIS se havia
        // texto após o cursor, empurrando-o pra sua própria linha em vez de
        // deixá-lo colado logo após "dd/mm/aaaa: ".
        if (e.key !== 'Enter' || e.shiftKey) return;
        e.preventDefault();

        const textarea = e.target;
        const { selectionStart, selectionEnd, value } = textarea;
        const antes = value.slice(0, selectionStart);
        const depois = value.slice(selectionEnd);
        const linha = `${formatarDataHoje()}: `;
        const quebraAntes = antes ? '\n' : '';
        const quebraDepois = depois ? '\n' : '';
        const novoValor = antes + quebraAntes + linha + quebraDepois + depois;

        setForm(prevForm => ({ ...prevForm, observacoes: novoValor }));

        requestAnimationFrame(() => {
            const novaPosicao = antes.length + quebraAntes.length + linha.length;
            textarea.setSelectionRange(novaPosicao, novaPosicao);
        });
    }

    function handleObservacoesChange(e) {
        const textarea = e.target;
        const { value, selectionStart } = textarea;
        const eraVazio = form.observacoes === '';

        // Ao digitar o primeiro caractere num campo vazio (sem passar pelo
        // Enter), já prefixa a data de hoje no início da frase.
        if (eraVazio && value.trim() !== '') {
            const prefixo = `${formatarDataHoje()}: `;
            const novoValor = prefixo + value;
            setForm(prevForm => ({ ...prevForm, observacoes: novoValor }));
            requestAnimationFrame(() => {
                const novaPosicao = prefixo.length + selectionStart;
                textarea.setSelectionRange(novaPosicao, novaPosicao);
            });
            return;
        }

        setForm(prevForm => ({ ...prevForm, observacoes: value }));
    }

    function handleSubmit(e) {
        e.preventDefault();

        // Validação para garantir que o ano da data tem 4 dígitos
        const validarAnoCompleto = (dataString) => {
            if (!dataString) return true; // Permite datas vazias.
            const ano = parseInt(dataString.split('-')[0], 10);
            // Garante que o ano é um número e tem 4 dígitos (ex: maior que 999).
            return !isNaN(ano) && ano > 999;
        };

        if (!validarAnoCompleto(form.dataRnm) || form.cirurgias.some(c => !validarAnoCompleto(c.data))) {
            alert('Data inválida. Por favor, preencha o ano com 4 dígitos (ex: 2024).');
            return;
        }
        // Fim da validação

        // --- Validação de Regras de Negócio (Data vs Status) ---
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Considera apenas a data, ignorando a hora atual
        
        const limiteAgendamento = new Date(hoje);
        limiteAgendamento.setMonth(limiteAgendamento.getMonth() + 2); // Define o limite de 2 meses no futuro

        for (let i = 0; i < form.cirurgias.length; i++) {
            const cirurgia = form.cirurgias[i];
            if (cirurgia.data && cirurgia.status) {
                // Cria data local explicitamente para evitar problemas de fuso horário com new Date(string)
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
        // -------------------------------------------------------

        const paciente = {
            ...form,
            fornecedor: form.fornecedor.map(f => f.nome.trim()).filter(f => f !== ''),
            ultimosFornecedores: form.ultimosFornecedores
                .filter(uf => uf.fornecedor && uf.fornecedor.trim() !== '')
                .map(uf => ({ fornecedor: uf.fornecedor.trim(), data: uf.data || null })),
            dataRnm: form.dataRnm || null
        };
        // Cirurgias não fazem mais parte do payload do paciente — cada uma vive
        // na própria coleção standalone e é sincronizada via chamadas dedicadas
        // (POST/PUT/DELETE /api/v2/cirurgias), decididas pelo App.jsx depois
        // de saber o pacienteId (que só existe de verdade após o paciente ser
        // salvo, no caso de um cadastro novo).
        delete paciente.cirurgias;
        delete paciente.cirurgiasRemovidas;

        const cirurgiasComData = form.cirurgias.map(c => ({ ...c, data: c.data || null, regiao: c.regiao.filter((r) => r) }));

        const cirurgiasNovas = cirurgiasComData.filter(c => !c._id && (
            (c.descricao && c.descricao.trim() !== '') ||
            c.data ||
            (c.fornecedor && c.fornecedor.trim() !== '') ||
            (c.hospital && c.hospital.trim() !== '') ||
            c.regiao.length > 0
        ));
        const cirurgiasEditadas = cirurgiasComData.filter(c => !!c._id);

        onSubmit(paciente, {
            criar: cirurgiasNovas,
            atualizar: cirurgiasEditadas,
            apagar: form.cirurgiasRemovidas,
        });
    }

    const modoEdicao = !!pacienteParaEditar;

    return (
        <form onSubmit={handleSubmit} className="p-6 border rounded-lg bg-white shadow-sm mb-8">
            <h2 className="font-bold text-xl mb-4 text-gray-800">{modoEdicao ? "Editar Paciente" : "Cadastrar Novo Paciente"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="cpf" placeholder="CPF (somente números)" value={form.cpf} onChange={handleChange} className="border p-2 rounded w-full" required />
                <input name="nome" placeholder="Nome Completo" value={form.nome} onChange={handleChange} className="border p-2 rounded w-full" required />
                <input name="convenio" placeholder="Convênio" value={form.convenio} onChange={handleChange} className="border p-2 rounded w-full" />
                <input name="contato" placeholder="Contato (Telefone)" value={form.contato} onChange={handleChange} className="border p-2 rounded w-full" />
                <div className="flex items-center"><label htmlFor="dataRnm" className="text-sm text-gray-600 mr-2">Data RNM:</label><input id="dataRnm" type="date" name="dataRnm" value={form.dataRnm} onChange={handleChange} className="border p-2 rounded w-full" /></div>

                {/* --- SEÇÃO DE FORNECEDOR ATUAL DINÂMICA (paciente pode ter mais de um ao mesmo tempo) --- */}
                <div className="md:col-span-2 space-y-3 pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg text-gray-700">Fornecedor Atual</h3>
                        <button type="button" onClick={adicionarFornecedorAtual} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-md text-sm">
                            + Adicionar Fornecedor Atual
                        </button>
                    </div>
                    {form.fornecedor.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhum fornecedor atual registrado.</p>
                    ) : (
                        form.fornecedor.map((item, index) => (
                            <div key={item.chave} className="flex items-center gap-2">
                                <input
                                    value={item.nome}
                                    onChange={(e) => handleFornecedorAtualChange(index, e)}
                                    placeholder="Nome do fornecedor"
                                    className="border p-2 rounded w-full"
                                />
                                <button
                                    type="button"
                                    onClick={() => enviarParaUltimosFornecedores(index)}
                                    title="Registrar em Últimos Fornecedores"
                                    className="text-blue-600 hover:text-blue-800 flex-shrink-0 p-1"
                                >
                                    <IconRepeat />
                                </button>
                                <button type="button" onClick={() => removerFornecedorAtual(index)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-full text-xs flex-shrink-0">
                                    X
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* --- SEÇÃO DE ÚLTIMOS FORNECEDORES DINÂMICA --- */}
                <div className="md:col-span-2 space-y-3 pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg text-gray-700">Últimos Fornecedores</h3>
                        <button type="button" onClick={adicionarUltimoFornecedor} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-md text-sm">
                            + Adicionar Último Fornecedor
                        </button>
                    </div>
                    {form.ultimosFornecedores.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhum fornecedor anterior registrado.</p>
                    ) : (
                        form.ultimosFornecedores.map((uf, index) => (
                            <div key={index} className="p-3 border rounded-md bg-gray-50 relative grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input name="fornecedor" placeholder="Nome do fornecedor" value={uf.fornecedor} onChange={(e) => handleUltimoFornecedorChange(index, e)} className="border p-2 rounded w-full" />
                                <div className="flex items-center">
                                    <label htmlFor={`ultimo-fornecedor-data-${index}`} className="text-sm text-gray-600 mr-2 whitespace-nowrap">Data:</label>
                                    <input id={`ultimo-fornecedor-data-${index}`} type="date" name="data" value={uf.data} onChange={(e) => handleUltimoFornecedorChange(index, e)} className="border p-2 rounded w-full" />
                                </div>
                                <button type="button" onClick={() => removerUltimoFornecedor(index)} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-full text-xs">
                                    X
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* --- SEÇÃO DE CIRURGIAS DINÂMICA --- */}
                <div className="md:col-span-2 space-y-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg text-gray-700">Cirurgias</h3>
                        <button type="button" onClick={adicionarCirurgia} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-md text-sm">
                            + Adicionar Cirurgia
                        </button>
                    </div>
                    {form.cirurgias.map((cirurgia, index) => {
                        return (
                        <div key={index} ref={(el) => (cirurgiaRefs.current[index] = el)} className="p-4 border rounded-md bg-gray-50 relative grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input name="fornecedor" placeholder="Fornecedor da Cirurgia" value={cirurgia.fornecedor} onChange={(e) => handleCirurgiaChange(index, e)} className="border p-2 rounded w-full" />
                            <input name="hospital" placeholder="Hospital" value={cirurgia.hospital} onChange={(e) => handleCirurgiaChange(index, e)} className="border p-2 rounded w-full" />

                            {/* Região: lista repetível — uma cirurgia pode tratar mais de uma articulação (dado real). */}
                            <div className="md:col-span-2 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Região</span>
                                    <button type="button" onClick={() => adicionarRegiao(index)} className="text-green-600 hover:text-green-800 text-sm font-semibold">
                                        + Adicionar Região
                                    </button>
                                </div>
                                {cirurgia.regiao.length === 0 ? (
                                    <p className="text-sm text-gray-500">Nenhuma região selecionada.</p>
                                ) : (
                                    cirurgia.regiao.map((r, regiaoIndex) => {
                                        // Dados legados usavam texto livre (ex: "Cervical", "Lombar") — se o
                                        // valor atual não estiver na lista padronizada, preserva ele como uma
                                        // opção extra em vez de apagar silenciosamente ao renderizar o select.
                                        const opcoesRegiao = (!r || REGIOES_CIRURGIA.includes(r)) ? REGIOES_CIRURGIA : [r, ...REGIOES_CIRURGIA];
                                        return (
                                            <div key={regiaoIndex} className="flex items-center gap-2">
                                                <select value={r} onChange={(e) => handleRegiaoChange(index, regiaoIndex, e.target.value)} className="border p-2 rounded w-full">
                                                    <option value="">Selecione a região</option>
                                                    {opcoesRegiao.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                                <button type="button" onClick={() => removerRegiao(index, regiaoIndex)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-full text-xs flex-shrink-0">
                                                    X
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <select name="status" value={cirurgia.status} onChange={(e) => handleCirurgiaChange(index, e)} className="border p-2 rounded w-full">
                                {STATUS_CIRURGIA.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
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
                        );
                    })}
                </div>

                <input name="linkArquivos" placeholder="Link para Arquivos (Google Drive, etc.)" value={form.linkArquivos} onChange={handleChange} className="border p-2 rounded w-full md:col-span-2" />
                <textarea name="observacoes" placeholder="Observações" value={form.observacoes} onChange={handleObservacoesChange} onKeyDown={handleObservacoesKeyDown} className="border p-2 rounded w-full md:col-span-2" rows="3"></textarea>
            </div>
            <div className="mt-4 flex items-center">
                <button className={`text-white px-4 py-2 rounded-md font-semibold ${modoEdicao ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>{modoEdicao ? "Atualizar Paciente" : "Salvar Paciente"}</button>
                {onCancel && (<button type="button" onClick={onCancel} className="ml-3 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-semibold">Cancelar</button>)}
            </div>
        </form>
    );
}