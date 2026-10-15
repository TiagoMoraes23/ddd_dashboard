import Paciente from "../models/Paciente.js";
import exceljs from 'exceljs';

const getPacientes = async (req, res) => {
    try {
        const { q, fornecedor, dataCirurgia, sortBy } = req.query;
        let filtro = {};
        let sortOptions = { createdAt: -1 }; 
        let pacientes = [];

        if (fornecedor || dataCirurgia) {
            const pipeline = [];
            const matchConditions = {};

            if (fornecedor) matchConditions["cirurgias.fornecedor"] = new RegExp(fornecedor, "i");
            if (dataCirurgia) {
                const [inicio, fim] = criarIntervaloDeData(dataCirurgia);
                if (inicio && fim) matchConditions["cirurgias.data"] = { $gte: inicio, $lte: fim };
            }
            
            pipeline.push({ $unwind: "$cirurgias" }, { $match: matchConditions });
            
            if (sortBy === 'data_asc' || sortBy === 'data_desc') {
                const sortOrder = sortBy === 'data_asc' ? 1 : -1;
                pipeline.push({ $sort: { "cirurgias.data": sortOrder } });
            }

            pipeline.push(
                { $group: { _id: "$_id", doc: { $first: "$$ROOT" }, cirurgias: { $push: "$cirurgias" } } },
                { $replaceWith: { $mergeObjects: ["$doc", { cirurgias: "$cirurgias" }] } }
            );

            if (sortBy === 'data_asc' || sortBy === 'data_desc') {
                const sortOrder = sortBy === 'data_asc' ? 1 : -1;
                pipeline.push({ $sort: { "cirurgias.0.data": sortOrder } });
            }

            pacientes = await Paciente.aggregate(pipeline);

        } else if (q && q.trim() !== "") {
            const searchString = q.trim();
            const searchParts = searchString.split(/\s+/);
            const firstWord = searchParts[0].toLowerCase();
            const keywords = ['fornecedor', 'convenio', 'obs'];

            if (keywords.includes(firstWord) && searchParts.length > 1) {
                const searchValue = searchParts.slice(1).join(' ');
                const regex = new RegExp(searchValue, "i");
                switch (firstWord) {
                    case 'fornecedor': filtro = { $or: [{ fornecedor: regex }, { "cirurgias.fornecedor": regex }] }; break;
                    case 'convenio': filtro = { convenio: regex }; break;
                    case 'obs': filtro = { observacoes: regex }; break;
                }
            } else {
                const regex = new RegExp(searchString, "i");
                filtro = { $or: [ { nome: regex }, { cpf: regex }, { convenio: regex }, { fornecedor: regex }, { observacoes: regex }, { "cirurgias.descricao": regex }, { "cirurgias.fornecedor": regex }, { "cirurgias.hospital": regex } ] };
            }
            pacientes = await Paciente.find(filtro).sort(sortOptions);
        } else {
            pacientes = await Paciente.find({}).sort(sortOptions);
        }

        const totalCirurgias = (fornecedor || dataCirurgia) ? pacientes.reduce((acc, p) => acc + (p.cirurgias?.length || 0), 0) : 0;
        res.json({ pacientes, totalCirurgias });

    } catch (err) {
        console.error("Erro na busca de pacientes:", err);
        res.status(500).json({ message: "Erro no servidor ao buscar pacientes." });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const hoje = new Date();
        const umAnoAtras = new Date(new Date().setFullYear(hoje.getFullYear() - 1));
        const onzeMesesAtras = new Date(new Date().setMonth(hoje.getMonth() - 11));
        const tresMesesAtras = new Date(new Date().setMonth(hoje.getMonth() - 3));

        const [
            statsCirurgias,
            rnmVencidas,
            solicitarNovaRnm,
            reentrada
        ] = await Promise.all([
            Paciente.aggregate([
                { $unwind: "$cirurgias" },
                {
                    $group: {
                        _id: "$cirurgias.status",
                        count: { $sum: 1 }
                    }
                }
            ]),
            Paciente.countDocuments({ dataRnm: { $lt: umAnoAtras } }),
            Paciente.countDocuments({ dataRnm: { $gte: umAnoAtras, $lt: onzeMesesAtras } }),
            Paciente.aggregate([
                { $match: { dataRnm: { $gte: umAnoAtras } } },
                { $unwind: "$cirurgias" },
                { $match: { "cirurgias.status": "Realizado", "cirurgias.data": { $lt: tresMesesAtras } } },
                { $group: { _id: "$_id" } },
                { $count: "total" }
            ])
        ]);

        const statusCounts = statsCirurgias.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        res.json({
            autorizados: statusCounts['Autorizado'] || 0,
            agendados: statusCounts['Agendado'] || 0,
            agendamentoPendente: statusCounts['Agendamento Pendente'] || 0,
            rnmVencidas: rnmVencidas,
            solicitarNovaRnm: solicitarNovaRnm,
            reentrada: reentrada.length > 0 ? reentrada[0].total : 0,
        });

    } catch (err) {
        console.error("Erro ao buscar estatísticas do dashboard:", err);
        res.status(500).json({ message: "Erro no servidor ao buscar estatísticas." });
    }
};

const getRecentPacientes = async (req, res) => {
    try {
        const pacientes = await Paciente.find({})
            .sort({ updatedAt: -1 })
            .limit(5);
        res.json(pacientes);
    } catch (err) {
        console.error("Erro ao buscar pacientes recentes:", err);
        res.status(500).json({ message: "Erro no servidor ao buscar pacientes recentes." });
    }
};

const buscarCirurgias = async (req, res) => {
    try {
        const { q, fornecedor, dataCirurgia, status, sortBy } = req.query;
        
        const pipeline = [
            { 
                $unwind: { 
                    path: "$cirurgias", preserveNullAndEmptyArrays: true 
                } 
            },
        ];

        const matchConditions = {};

        if (q) {
            const searchString = q.trim();
            const searchParts = searchString.split(/\s+/);
            const firstWord = searchParts[0].toLowerCase();
            const searchValue = searchParts.slice(1).join(' ');

            if ((firstWord === 'fornecedor' || firstWord === 'rnm') && searchValue) {
                if (firstWord === 'fornecedor') {
                    const regex = new RegExp(searchValue, "i");
                    matchConditions.fornecedor = regex;
                } else if (firstWord === 'rnm') {
                    const [inicio, fim] = criarIntervaloDeData(searchValue);
                    if (inicio && fim) {
                        matchConditions.dataRnm = { $gte: inicio, $lte: fim };
                    }
                }
            } else {
                const regex = new RegExp(searchString, "i");
                matchConditions.$or = [
                    { nome: regex },
                    { cpf: regex },
                    { convenio: regex },
                    { observacoes: regex },
                    { "cirurgias.descricao": regex },
                    { "cirurgias.fornecedor": regex },
                    { "cirurgias.hospital": regex },
                ];
            }
        }

        if (fornecedor) {
            matchConditions["cirurgias.fornecedor"] = new RegExp(fornecedor, "i");
        }
        if (dataCirurgia) {
            const [inicio, fim] = criarIntervaloDeData(dataCirurgia);
            if (inicio && fim) {
                matchConditions["cirurgias.data"] = { $gte: inicio, $lte: fim };
            }
        }
        if (status) {
            matchConditions["cirurgias.status"] = status;
        }

        if (fornecedor || dataCirurgia) {
            matchConditions["cirurgias.data"] = { ...matchConditions["cirurgias.data"], $ne: null };
        }
        if (status && status !== 'Autorizado' && status !== 'Agendamento Pendente' && status !== 'Senha expirada' && status !== 'Cancelado (outro motivo)') {
            matchConditions["cirurgias.data"] = { ...matchConditions["cirurgias.data"], $ne: null };
        }

        if (Object.keys(matchConditions).length > 0) {
            pipeline.push({ $match: matchConditions });
        }

        const sortOptions = {};
        if (sortBy === 'data_asc') {
            sortOptions["cirurgias.data"] = 1;
        } else if (sortBy === 'data_desc') {
            sortOptions["cirurgias.data"] = -1;
        } else {
            sortOptions["cirurgias.data"] = -1;
        }
        pipeline.push({ $sort: sortOptions });

        pipeline.push({
            $project: {
                _id: "$cirurgias._id",
                pacienteId: "$_id",
                pacienteNome: "$nome",
                pacienteCpf: "$cpf",
                pacienteDataRnm: "$dataRnm",
                pacienteConvenio: "$convenio",
                pacienteFornecedor: "$fornecedor",
                descricao: "$cirurgias.descricao",
                data: "$cirurgias.data",
                horario: "$cirurgias.horario",
                opme: "$cirurgias.opme",
                status: "$cirurgias.status",
                fornecedor: "$cirurgias.fornecedor",
                hospital: "$cirurgias.hospital",
            }
        });

        const cirurgias = await Paciente.aggregate(pipeline);
        res.json(cirurgias);

    } catch (err) {
        console.error("Erro ao buscar cirurgias:", err);
        res.status(500).json({ message: "Erro no servidor ao buscar cirurgias." });
    }
};

const exportarCirurgias = async (req, res) => {
    try {
        const { q, fornecedor, dataCirurgia, status, sortBy } = req.query;
        
        const pipeline = [
            { $unwind: { path: "$cirurgias", preserveNullAndEmptyArrays: true } },
        ];

        const matchConditions = {};

        if (q) {
            const searchString = q.trim();
            const searchParts = searchString.split(/\s+/);
            const firstWord = searchParts[0].toLowerCase();
            const searchValue = searchParts.slice(1).join(' ');

            if ((firstWord === 'fornecedor' || firstWord === 'rnm') && searchValue) {
                if (firstWord === 'fornecedor') {
                    matchConditions.$or = [{ fornecedor: new RegExp(searchValue, "i") }, { "cirurgias.fornecedor": new RegExp(searchValue, "i") }];
                } else if (firstWord === 'rnm') {
                    const [inicio, fim] = criarIntervaloDeData(searchValue);
                    if (inicio && fim) matchConditions.dataRnm = { $gte: inicio, $lte: fim };
                }
            } else {
                const regex = new RegExp(searchString, "i");
                matchConditions.$or = [{ nome: regex }, { cpf: regex }, { convenio: regex }, { observacoes: regex }, { "cirurgias.descricao": regex }, { "cirurgias.fornecedor": regex }, { "cirurgias.hospital": regex }];
            }
        }

        if (fornecedor) matchConditions["cirurgias.fornecedor"] = new RegExp(fornecedor, "i");
        if (dataCirurgia) {
            const [inicio, fim] = criarIntervaloDeData(dataCirurgia);
            if (inicio && fim) matchConditions["cirurgias.data"] = { $gte: inicio, $lte: fim };
        }
        if (status) matchConditions["cirurgias.status"] = status;

        if (fornecedor || dataCirurgia) matchConditions["cirurgias.data"] = { ...matchConditions["cirurgias.data"], $ne: null };
        if (status && status !== 'Autorizado' && status !== 'Agendamento Pendente' && status !== 'Senha expirada' && status !== 'Cancelado (outro motivo)') matchConditions["cirurgias.data"] = { ...matchConditions["cirurgias.data"], $ne: null };

        if (Object.keys(matchConditions).length > 0) pipeline.push({ $match: matchConditions });

        const sortOptions = {};
        if (sortBy === 'data_asc') sortOptions["cirurgias.data"] = 1;
        else sortOptions["cirurgias.data"] = -1;
        pipeline.push({ $sort: sortOptions });

        pipeline.push({
            $group: {
                _id: "$_id",
                doc: { $first: '$$ROOT' },
                cirurgiasFiltradas: { $push: '$cirurgias' }
            }
        });

        pipeline.push({
            $replaceRoot: { newRoot: { $mergeObjects: [ "$doc", { cirurgias: "$cirurgiasFiltradas" } ] } }
        });

        const pacientesAgrupados = await Paciente.aggregate(pipeline);

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Cirurgias');

        worksheet.columns = [
            { header: 'Paciente', key: 'nome', width: 30 },
            { header: 'CPF', key: 'cpf', width: 15 },
            { header: 'Convênio', key: 'convenio', width: 25 },
            { header: 'Fornecedor Atual', key: 'fornecedor', width: 30 },
            { header: 'Status Cirurgias', key: 'cirurgias_status', width: 25 },
            { header: 'Datas Cirurgias', key: 'cirurgias_datas', width: 20 },
            { header: 'Horários', key: 'cirurgias_horarios', width: 15 },
            { header: 'OPME', key: 'cirurgias_opme', width: 30 },
            { header: 'Fornecedores Cirurgias', key: 'cirurgias_fornecedores', width: 40 },
            { header: 'Hospitais Cirurgias', key: 'cirurgias_hospitais', width: 40 },
            { header: 'Observações Cirurgias', key: 'cirurgias_descricoes', width: 50 },
            { header: 'Data RNM', key: 'dataRnm', width: 15 },
            { header: 'Últimos Fornecedores', key: 'ultimosFornecedores', width: 40 },
        ];

        const formatarDataParaExcel = (data) => data ? new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A';

        pacientesAgrupados.forEach(paciente => {
            const rowData = {
                ...paciente,
                ultimosFornecedores: paciente.ultimosFornecedores?.join(', ') || 'N/A',
                dataRnm: formatarDataParaExcel(paciente.dataRnm),
                cirurgias_datas: paciente.cirurgias.map(c => formatarDataParaExcel(c.data)).join(';\n'),
                cirurgias_status: paciente.cirurgias.map(c => c.status || 'N/A').join(';\n'),
                cirurgias_horarios: paciente.cirurgias.map(c => c.horario || '—').join(';\n'),
                cirurgias_opme: paciente.cirurgias.map(c => c.opme || '—').join(';\n'),
                cirurgias_fornecedores: paciente.cirurgias.map(c => c.fornecedor || 'N/A').join(';\n'),
                cirurgias_hospitais: paciente.cirurgias.map(c => c.hospital || 'N/A').join(';\n'),
                cirurgias_descricoes: paciente.cirurgias.map(c => c.descricao || 'N/A').join(';\n'),
            };
            const row = worksheet.addRow(rowData);
            row.eachCell({ includeEmpty: true }, (cell) => {
                if (String(cell.value).includes('\n')) {
                    cell.alignment = { wrapText: true, vertical: 'top' };
                }
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio_cirurgias.xlsx"');
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error("Erro ao exportar cirurgias:", err);
        res.status(500).json({ message: "Erro no servidor ao gerar o relatório." });
    }
};

const getPacienteByCpf = async (req, res) => {
    try {
        const paciente = await Paciente.findOne({ cpf: req.params.cpf });
        if (paciente) {
            res.json(paciente);
        } else {
            res.status(404).json({ message: 'Paciente não encontrado' });
        }
    } catch (err) {
        console.error("Erro ao buscar paciente por CPF:", err);
        res.status(500).json({ message: "Erro no servidor ao buscar paciente." });
    }
};

const getPacientesByKpi = async (req, res) => {
    const { kpiName } = req.params;
    const hoje = new Date();
    const umAnoAtras = new Date(new Date().setFullYear(hoje.getFullYear() - 1));
    const onzeMesesAtras = new Date(new Date().setMonth(hoje.getMonth() - 11));
    const tresMesesAtras = new Date(new Date().setMonth(hoje.getMonth() - 3));

    let query = {};

    try {
        switch (kpiName) {
            case 'autorizados':
            case 'agendados':
            case 'agendamentoPendente':
                const statusMap = {
                    autorizados: 'Autorizado',
                    agendados: 'Agendado',
                    agendamentoPendente: 'Agendamento Pendente'
                };
                const statusToFind = statusMap[kpiName];

                const cirurgiasPipeline = [
                    { $unwind: "$cirurgias" },
                    { $match: { "cirurgias.status": statusToFind } },
                    { $sort: { "cirurgias.data": 1, "cirurgias.horario": 1 } },
                    {
                        $project: {
                            _id: "$cirurgias._id",
                            pacienteNome: "$nome",
                            pacienteCpf: "$cpf",
                            pacienteConvenio: "$convenio",
                            horario: "$cirurgias.horario",
                            opme: "$cirurgias.opme",
                            fornecedor: "$cirurgias.fornecedor",
                            status: "$cirurgias.status",
                            data: "$cirurgias.data",
                            hospital: "$cirurgias.hospital",
                        }
                    }
                ];
                const cirurgias = await Paciente.aggregate(cirurgiasPipeline);
                return res.json(cirurgias);
            case 'rnmVencidas':
                const pacientesRnm = await Paciente.find({ dataRnm: { $lt: umAnoAtras } }).sort({ dataRnm: -1 });
                return res.json(pacientesRnm);
            case 'solicitarNovaRnm':
                query = { dataRnm: { $gte: umAnoAtras, $lt: onzeMesesAtras } };
                break;
            case 'reentrada':
                const reentradaPipeline = [
                    { $match: { dataRnm: { $gte: umAnoAtras } } },
                    { $unwind: "$cirurgias" },
                    { $match: { "cirurgias.status": "Realizado", "cirurgias.data": { $lt: tresMesesAtras } } },
                    { $sort: { "cirurgias.data": -1 } },
                    {
                        $project: {
                            _id: "$cirurgias._id",
                            pacienteNome: "$nome",
                            pacienteCpf: "$cpf",
                            data: "$cirurgias.data",
                            regiao: "$cirurgias.regiao",
                            fornecedor: "$cirurgias.fornecedor",
                            hospital: "$cirurgias.hospital"
                        }
                    }
                ];
                const resultadosReentrada = await Paciente.aggregate(reentradaPipeline);
                return res.json(resultadosReentrada);
            default:
                return res.status(400).json({ message: "KPI inválido." });
        }

        const pacientes = await Paciente.find(query).sort({ updatedAt: -1 });
        res.json(pacientes);

    } catch (err) {
        console.error(`Erro ao buscar pacientes para o KPI ${kpiName}:`, err);
        res.status(500).json({ message: "Erro no servidor ao buscar pacientes para o KPI." });
    }
};

function criarIntervaloDeData(texto) {
    if (!texto) return [null, null];
    
    const diaMesAnoRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const mesAnoRegex = /^(\d{2})\/(\d{4})$/;
    const anoRegex = /^\d{4}$/;

    const matchDiaMesAno = texto.match(diaMesAnoRegex);
    const matchMesAno = texto.match(mesAnoRegex);
    const matchAno = texto.match(anoRegex);

    let inicioPeriodo, fimPeriodo;

    if (matchDiaMesAno) {
        const dia = parseInt(matchDiaMesAno[1], 10);
        const mes = parseInt(matchDiaMesAno[2], 10) - 1;
        const ano = parseInt(matchDiaMesAno[3], 10);
        if (dia > 0 && dia <= 31 && mes >= 0 && mes < 12) {
            inicioPeriodo = new Date(Date.UTC(ano, mes, dia));
            fimPeriodo = new Date(Date.UTC(ano, mes, dia, 23, 59, 59, 999));
        }
    } else if (matchMesAno) {
        const mes = parseInt(matchMesAno[1], 10) - 1;
        const ano = parseInt(matchMesAno[2], 10);
        if (mes >= 0 && mes < 12) {
            inicioPeriodo = new Date(Date.UTC(ano, mes, 1));
            fimPeriodo = new Date(Date.UTC(ano, mes + 1, 0, 23, 59, 59, 999));
        }
    } else if (matchAno && texto.length === 4 && !isNaN(parseInt(texto, 10))) {
        const ano = parseInt(texto, 10);
        inicioPeriodo = new Date(Date.UTC(ano, 0, 1));
        fimPeriodo = new Date(Date.UTC(ano, 11, 31, 23, 59, 59, 999));
    }
    return [inicioPeriodo, fimPeriodo];
}

const verificarConflitoAgendamento = async (cirurgias, cpfIgnorado = null) => {
    const agendamentos = cirurgias.filter(c => c.status === 'Agendado' && c.data && c.horario);

    for (const agendamento of agendamentos) {
        const dataBusca = new Date(agendamento.data);
        
        if (!/^\d{2}:\d{2}$/.test(agendamento.horario)) continue;

        const [newHours, newMinutes] = agendamento.horario.split(':').map(Number);
        const newTimeInMinutes = newHours * 60 + newMinutes;

        const otherSurgeriesOnDay = await Paciente.aggregate([
            { $match: { cpf: { $ne: cpfIgnorado } } },
            { $unwind: "$cirurgias" },
            { $match: { 
                "cirurgias.status": "Agendado",
                "cirurgias.data": dataBusca,
                "cirurgias.horario": { $ne: null, $exists: true }
            }},
            { $project: {
                _id: 0,
                horario: "$cirurgias.horario",
                pacienteNome: "$nome"
            }}
        ]);

        for (const existingSurgery of otherSurgeriesOnDay) {
            if (!existingSurgery.horario || !/^\d{2}:\d{2}$/.test(existingSurgery.horario)) {
                continue;
            }
            const [existingHours, existingMinutes] = existingSurgery.horario.split(':').map(Number);
            const existingTimeInMinutes = existingHours * 60 + existingMinutes;

            if (Math.abs(newTimeInMinutes - existingTimeInMinutes) < 30) {
                const dataFormatada = dataBusca.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                return {
                    erro: true,
                    mensagem: `Conflito de agendamento! O horário ${agendamento.horario} do dia ${dataFormatada} conflita com a cirurgia de ${existingSurgery.pacienteNome} às ${existingSurgery.horario}. Por favor, escolha um horário diferente.`
                }
            }
        }
    }
    return { erro: false };
};

const createPaciente = async (req, res) => {
    try {
        if (req.body.cirurgias) {
            const verificacao = await verificarConflitoAgendamento(req.body.cirurgias);
            if (verificacao.erro) {
                return res.status(409).json({ message: verificacao.mensagem });
            }
        }

        const paciente = new Paciente(req.body);
        await paciente.save();
        res.status(201).json(paciente);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const updatePaciente = async (req, res) => {
    try {
        if (req.body.cirurgias) {
            const verificacao = await verificarConflitoAgendamento(req.body.cirurgias, req.params.cpf);
            if (verificacao.erro) {
                return res.status(409).json({ message: verificacao.mensagem });
            }
        }

        const paciente = await Paciente.findOneAndUpdate(
            { cpf: req.params.cpf },
            req.body,
            { new: true, runValidators: true }
        );
        if (!paciente) return res.status(404).json({ message: "Paciente não encontrado" });
        res.json(paciente);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const deletePaciente = async (req, res) => {
    try {
        const paciente = await Paciente.findOneAndDelete({ cpf: req.params.cpf });
        if (!paciente) return res.status(404).json({ message: "Paciente não encontrado" });
        res.json({ message: "Paciente removido com sucesso" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const exportPacientes = async (req, res) => {
    try {
        const { q, fornecedor, dataCirurgia, sortBy } = req.query;
        let pacientes = [];

        if (fornecedor || dataCirurgia) {
            const matchConditions = {};
            let inicio, fim;

            if (fornecedor) {
                matchConditions["cirurgias.fornecedor"] = new RegExp(fornecedor, "i");
            }
            if (dataCirurgia) {
                [inicio, fim] = criarIntervaloDeData(dataCirurgia);
                if (inicio && fim) {
                    matchConditions["cirurgias.data"] = { $gte: inicio, $lte: fim };
                }
            }

            if (sortBy === 'data_asc' || sortBy === 'data_desc') {
                matchConditions["cirurgias.data"] = { ...matchConditions["cirurgias.data"], $ne: null };
            }

            const pipeline = [
                { $unwind: "$cirurgias" },
                { $match: matchConditions },
            ];

            if (sortBy === 'data_asc' || sortBy === 'data_desc') {
                const sortOrder = sortBy === 'data_asc' ? 1 : -1;
                pipeline.push({ $sort: { "cirurgias.data": sortOrder } });
            }

            pipeline.push(
                { $group: { _id: "$_id", doc: { $first: "$$ROOT" }, cirurgias: { $push: "$cirurgias" } } },
                { $replaceWith: { $mergeObjects: ["$doc", { cirurgias: "$cirurgias" }] } }
            );

            if (sortBy === 'data_asc' || sortBy === 'data_desc') {
                const sortOrder = sortBy === 'data_asc' ? 1 : -1;
                pipeline.push({ $sort: { "cirurgias.0.data": sortOrder } });
            } else {
                pipeline.push({ $sort: { createdAt: -1 } });
            }

            pacientes = await Paciente.aggregate(pipeline);

        } else if (q && q.trim() !== "") {
            const regex = new RegExp(q, "i");
            const filtro = {
                $or: [
                    { nome: regex }, { cpf: regex }, { convenio: regex },
                    { fornecedor: regex }, { "cirurgias.descricao": regex },
                    { "cirurgias.fornecedor": regex }, { "cirurgias.hospital": regex }
                ]
            };
            pacientes = await Paciente.find(filtro).sort({ createdAt: -1 }).lean();
        } else {
            pacientes = await Paciente.find({}).sort({ createdAt: -1 }).lean();
        }

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Pacientes');

        worksheet.columns = [
            { header: 'Nome', key: 'nome', width: 30 },
            { header: 'Convênio', key: 'convenio', width: 25 },
            { header: 'Fornecedor', key: 'fornecedor', width: 30 },
            { header: 'Data RNM', key: 'dataRnm', width: 15 },
            { header: 'Cirurgias (Observações)', key: 'cirurgias_descricoes', width: 50 },
            { header: 'Cirurgias (Datas)', key: 'cirurgias_datas', width: 20 },
            { header: 'Cirurgias (Status)', key: 'cirurgias_status', width: 25 },
            { header: 'Cirurgias (Fornecedores)', key: 'cirurgias_fornecedores', width: 40 },
            { header: 'Cirurgias (Hospitais)', key: 'cirurgias_hospitais', width: 40 },
            { header: 'Observações', key: 'observacoes', width: 50 },
            { header: 'CPF', key: 'cpf', width: 15 },
            { header: 'Contato', key: 'contato', width: 15 }
        ];

        pacientes.forEach(paciente => {
            const cirurgias = paciente.cirurgias || [];

            const formatarDataParaExcel = (data) => {
                if (!data) return 'N/A';
                return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            };

            const rowData = {
                ...paciente,
                dataRnm: formatarDataParaExcel(paciente.dataRnm),
                cirurgias_descricoes: cirurgias.map(c => c.descricao || 'N/A').join(';\n'),
                cirurgias_datas: cirurgias.map(c => formatarDataParaExcel(c.data)).join(';\n'),
                cirurgias_status: cirurgias.map(c => c.status || 'N/A').join(';\n'),
                cirurgias_fornecedores: cirurgias.map(c => c.fornecedor || 'N/A').join(';\n'),
                cirurgias_hospitais: cirurgias.map(c => c.hospital || 'N/A').join(';\n')
            };
            
            const row = worksheet.addRow(rowData);
            row.eachCell({ includeEmpty: true }, (cell) => {
                if (String(cell.value).includes('\n')) {
                    cell.alignment = { wrapText: true, vertical: 'top' };
                }
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio_pacientes.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("Erro ao exportar pacientes:", err);
        res.status(500).json({ message: "Erro no servidor ao exportar pacientes." });
    }
};

export { 
    getPacientes, 
    createPaciente, 
    updatePaciente, 
    deletePaciente, 
    exportPacientes, 
    getDashboardStats,
    getRecentPacientes,
    buscarCirurgias,
    exportarCirurgias,
    getPacienteByCpf,
    getPacientesByKpi
};
