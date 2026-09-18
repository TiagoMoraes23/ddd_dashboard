// Migra as cirurgias hoje embutidas em `pacientes.cirurgias` para a coleção
// standalone `cirurgias` (ADR 001, nunca executado fisicamente até agora).
//
// Não-destrutivo de propósito: só lê o array embutido, nunca apaga nem altera
// `pacientes.cirurgias` — a cópia intacta é a rede de segurança de rollback,
// em conjunto com o backup real feito antes de qualquer --apply (ver
// backend/scripts/_backups/).
//
// Além da cópia 1:1, esta migração resolve dois problemas de qualidade de
// dado reais, encontrados inspecionando o dado ao vivo antes de escrever este
// script (achados confirmados, não assumidos):
//
//   1) `regiao` tem drift de vocabulário real (não é acento — collation não
//      resolve): "cervical/dorsal/lombar" em variações, articulação com
//      lateralidade (direito/esquerdo/d/e/d+e), plural, etc. Normalizado via
//      um dicionário explícito (REGIAO_MAP) construído a partir dos 52
//      valores brutos distintos realmente encontrados no banco — não um
//      regex genérico. Valores que cruzam mais de uma categoria (ex.:
//      "cervical e ombro") ou não batem com nenhuma regra clara ficam com o
//      texto original preservado e são listados para revisão manual.
//
//   2) Muitas cirurgias sem `horario` têm o horário só como texto solto no
//      início de `descricao` (ex.: "horario 11h", "a partir de 9h") — resíduo
//      de quando o campo `horario` próprio ainda não existia. Extraído só
//      quando há exatamente UM horário reconhecível na descrição (validado
//      contra os 40 casos reais encontrados, nenhum ambíguo) — `descricao`
//      nunca é alterada, o horário extraído é só um campo a mais.
//
// Uso:
//   node scripts/migrarCirurgiasEmbutidas.js            (dry-run, não escreve nada)
//   node scripts/migrarCirurgiasEmbutidas.js --apply     (aplica de verdade)
require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Cirurgia = require('../src/modules/cirurgias/domain/Cirurgia');
const CirurgiaRepository = require('../src/modules/cirurgias/infra/repositories/CirurgiaRepository');
const CirurgiaModel = require('../src/modules/cirurgias/infra/database/mongoose/CirurgiaSchema');

// Dicionário construído a partir da inspeção ao vivo dos 52 valores brutos
// distintos de `regiao` hoje no banco (chave normalizada: trim + lowercase).
// Lista canônica confirmada com o usuário: Coluna, Ombro, Cotovelo, Punho,
// Mão, Quadril, Joelho, Tornozelo, Pé.
const REGIAO_MAP = {
  // --- Coluna (cervical/dorsal/lombar/torácica, isolados ou combinados) ---
  'coluna': ['Coluna'],
  'cervical/lombar': ['Coluna'],
  'lombar': ['Coluna'],
  'toracica': ['Coluna'],
  'cervical, dorsal, lombar': ['Coluna'],
  'cervical/dorsal/lombar': ['Coluna'],
  'cervical e lombar': ['Coluna'],
  'cervical dorsal e lombar': ['Coluna'],
  'cervical': ['Coluna'],
  '(cervical/dorsal/lombar)': ['Coluna'],
  'coluna lombar': ['Coluna'],
  'lombar cervical': ['Coluna'],
  'cervical/dorsal': ['Coluna'],
  'coluna toracica e lombar': ['Coluna'],
  'cervical lombar': ['Coluna'],
  'cerical, dorsal e lombar': ['Coluna'], // typo real ("cerical"), inequívoco pelo resto do texto

  // --- Ombro (com/sem lateralidade, plural) ---
  'ombro': ['Ombro'],
  'ombros': ['Ombro'],
  'ombro direito': ['Ombro'],
  'ombro e': ['Ombro'], // "E" = Esquerdo
  'ombro d': ['Ombro'], // "d" = direito
  'ombro d+e': ['Ombro'],

  // --- Joelho ---
  'joelho': ['Joelho'],
  'joelhos': ['Joelho'],
  'joelho direito': ['Joelho'],
  'joelho esquerdo': ['Joelho'],
  'artroscopia joelho': ['Joelho'],

  // --- Tornozelo ---
  'tornozelo': ['Tornozelo'],
  'tornozelos': ['Tornozelo'],

  // --- Cotovelo ---
  'cotovelo': ['Cotovelo'],
  'cotovelos': ['Cotovelo'],

  // --- Punho ---
  'punhos': ['Punho'],

  // --- Pé ---
  'pé': ['Pé'],
  'pé direito': ['Pé'],

  // --- Quadril ---
  'quadril': ['Quadril'],

  // --- Múltiplas articulações na mesma cirurgia (dado real, decidido com o
  // usuário: uma cirurgia pode tratar mais de uma região simultaneamente, por
  // isso `regiao` é array — mesmo padrão já usado pra `fornecedor` atual do
  // paciente) ---
  'ombros e cotovelos': ['Ombro', 'Cotovelo'],
  'cervical e ombro': ['Coluna', 'Ombro'],
  'ombros e joelhos': ['Ombro', 'Joelho'],
  'punhos, cotovelos e ombros': ['Punho', 'Cotovelo', 'Ombro'],

  // Único caso restante depois da revisão manual do usuário: a origem
  // marcava incerteza entre duas articulações ("?"), resolvido por quem
  // tem o contexto clínico real do caso.
  'punho ou joelho (?)': ['Joelho'],
};

function normalizarRegiao(valorBruto) {
  if (!valorBruto || !String(valorBruto).trim()) {
    return { canonico: [], ambiguo: false };
  }

  const chave = String(valorBruto).trim().toLowerCase();

  if (REGIAO_MAP[chave]) {
    return { canonico: REGIAO_MAP[chave], ambiguo: false };
  }

  // Não está no mapa — ex.: "punho ou joelho (?)", onde a própria origem do
  // dado já expressa incerteza (não é "as duas", é "não sei qual"). Preserva
  // o texto original como item único do array, em vez de adivinhar.
  return { canonico: [String(valorBruto).trim()], ambiguo: true };
}

// Extrai um horário "HH:MM" de dentro de `descricao`, só quando existe
// exatamente UM padrão de horário reconhecível (ex.: "horario 11h",
// "a partir de 9h", "Horário: 09:30", "Horário 10h:30"). Nunca altera
// `descricao` — o horário extraído é um campo adicional.
function extrairHorarioDeDescricao(descricao) {
  if (!descricao) return { valor: null, ambiguo: false };

  // O \b final evita falso positivo tipo "02 HYBRIDMAX" casando "02 H" (achado
  // real rodando o dry-run contra a descrição de uma cirurgia com OPME).
  const matches = [...String(descricao).matchAll(/(\d{1,2})\s*h\s*:?\s*(\d{2})?\b|(\d{1,2}):(\d{2})/gi)];

  if (matches.length === 0) return { valor: null, ambiguo: false };
  if (matches.length > 1) return { valor: null, ambiguo: true };

  const [, h1, m1, h2, m2] = matches[0];
  const hora = Number(h1 !== undefined ? h1 : h2);
  const minuto = Number((m1 !== undefined ? m1 : m2) || 0);

  if (hora > 23 || minuto > 59) return { valor: null, ambiguo: true };

  return { valor: `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`, ambiguo: false };
}

async function main() {
  const aplicar = process.argv.includes('--apply');

  await mongoose.connect(process.env.MONGO_URI);

  if (aplicar) {
    const totalExistente = await CirurgiaModel.countDocuments({});
    if (totalExistente > 0) {
      throw new Error(
        `A coleção "cirurgias" já tem ${totalExistente} documento(s). Este script cria IDs novos a cada execução ` +
        `e duplicaria dados se rodado de novo — abortando por segurança. Se a intenção é migrar do zero, ` +
        `limpe a coleção manualmente antes (com o backup já confirmado) e rode de novo.`
      );
    }
  }

  // Lê via driver bruto (não via Mongoose Model), pra enxergar campos como
  // `regiao`/`opme`/`hospital` que o Mongoose atual nem declara mais no
  // sub-schema embutido, mas que existem de verdade no dado gravado.
  const pacientesCollection = mongoose.connection.db.collection('pacientes');
  const cirurgiaRepository = new CirurgiaRepository(CirurgiaModel);

  const pacientes = await pacientesCollection.find({ 'cirurgias.0': { $exists: true } }).toArray();

  let totalCirurgias = 0;
  let totalCriadas = 0;
  const mapaRegiaoAplicado = {}; // raw -> { canonico, count }
  const regioesAmbiguas = []; // { paciente, cpf, valorBruto }
  const horariosExtraidos = []; // { paciente, cpf, descricao, horarioExtraido }
  const horariosAmbiguos = []; // { paciente, cpf, descricao }

  for (const paciente of pacientes) {
    for (const c of paciente.cirurgias || []) {
      totalCirurgias++;

      const regiaoResult = normalizarRegiao(c.regiao);
      if (regiaoResult.canonico.length > 0) {
        const chave = `${c.regiao} -> [${regiaoResult.canonico.join(', ')}]${regiaoResult.ambiguo ? ' [AMBÍGUO]' : ''}`;
        mapaRegiaoAplicado[chave] = (mapaRegiaoAplicado[chave] || 0) + 1;
      }
      if (regiaoResult.ambiguo) {
        regioesAmbiguas.push({ paciente: paciente.nome, cpf: paciente.cpf, valorBruto: c.regiao });
      }

      let horario = c.horario && String(c.horario).trim() !== '' ? String(c.horario).trim() : null;
      if (!horario) {
        const extraido = extrairHorarioDeDescricao(c.descricao);
        if (extraido.valor) {
          horario = extraido.valor;
          horariosExtraidos.push({ paciente: paciente.nome, cpf: paciente.cpf, descricao: c.descricao, horarioExtraido: extraido.valor });
        } else if (extraido.ambiguo) {
          horariosAmbiguos.push({ paciente: paciente.nome, cpf: paciente.cpf, descricao: c.descricao });
        }
      }

      const cirurgia = new Cirurgia({
        id: uuidv4(),
        pacienteId: String(paciente._id),
        descricao: c.descricao || null,
        status: c.status || undefined,
        data: c.data || null,
        horario,
        opme: c.opme || null,
        fornecedor: c.fornecedor || null,
        hospital: c.hospital || null,
        regiao: regiaoResult.canonico,
        observacoes: null, // campo nao existe nos dados embutidos de origem
      });

      if (aplicar) {
        await cirurgiaRepository.salvar(cirurgia);
      }
      totalCriadas++;
    }
  }

  console.log(`--- ${aplicar ? 'APLICANDO' : 'DRY-RUN'} ---`);
  console.log(`Pacientes com cirurgia embutida: ${pacientes.length}`);
  console.log(`Total de cirurgias lidas: ${totalCirurgias}`);
  console.log(`${aplicar ? 'Criadas na coleção standalone' : 'Seriam criadas (rode com --apply para aplicar)'}: ${totalCriadas}`);

  console.log('\n=== Mapeamento de região aplicado (bruto -> canônico, contagem) ===');
  Object.entries(mapaRegiaoAplicado)
    .sort((a, b) => b[1] - a[1])
    .forEach(([chave, count]) => console.log(`  ${count}x  ${chave}`));

  if (regioesAmbiguas.length > 0) {
    console.log(`\nATENÇÃO: ${regioesAmbiguas.length} região(ões) ambígua(s) ou não mapeada(s) — texto original preservado, revisar manualmente:`);
    regioesAmbiguas.forEach((r) => console.log(`  - ${r.paciente} (cpf ${r.cpf}): "${r.valorBruto}"`));
  }

  if (horariosExtraidos.length > 0) {
    console.log(`\n${horariosExtraidos.length} horário(s) extraído(s) automaticamente de "descricao" (campo horario ficou vazio na origem):`);
    horariosExtraidos.forEach((h) => console.log(`  - ${h.paciente} (cpf ${h.cpf}): "${h.descricao}" -> horario="${h.horarioExtraido}"`));
  }

  if (horariosAmbiguos.length > 0) {
    console.log(`\nATENÇÃO: ${horariosAmbiguos.length} cirurgia(s) com "descricao" mencionando mais de um horário possível (ou fora de faixa) — não extraído automaticamente, revisar manualmente:`);
    horariosAmbiguos.forEach((h) => console.log(`  - ${h.paciente} (cpf ${h.cpf}): "${h.descricao}"`));
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
