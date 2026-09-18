// Migra o campo `ultimosFornecedores` de array de strings livres
// (ex: "Nome: dd/mm/aaaa", "Nome dd/mm/aaaa", ou só "Nome" sem data)
// para um array estruturado [{ fornecedor, data }], ordenado do mais recente
// para o mais antigo (entradas sem data ficam por último).
//
// Roda direto contra a collection via driver nativo (não via Mongoose/schema)
// para não sofrer cast automático enquanto o schema ainda não foi atualizado —
// a ordem correta é: 1) migrar os dados, 2) só então atualizar PacienteSchema.js.
//
// Uso:
//   node scripts/migrarUltimosFornecedores.js            (dry-run, não escreve nada)
//   node scripts/migrarUltimosFornecedores.js --apply     (aplica de verdade)
require('dotenv').config();
const mongoose = require('mongoose');

function parseUltimoFornecedor(texto) {
  const str = String(texto).trim();

  // Formato mais comum: "Nome: dd/mm/aaaa" ou "Nome dd/mm/aaaa" (achamos até
  // "\" no lugar de "/" em registro real — aceita os dois separadores).
  let match = str.match(/^(.*?)\s*:?\s*(\d{2})[/\\](\d{2})[/\\](\d{4})\s*$/);
  if (match) {
    const [, nome, dia, mes, ano] = match;
    return {
      fornecedor: nome.replace(/:$/, '').trim(),
      data: new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia))),
    };
  }

  // Formato invertido, também encontrado em registro real: "dd/mm/aaaa: Nome".
  match = str.match(/^(\d{2})[/\\](\d{2})[/\\](\d{4})\s*:?\s*(.+)$/);
  if (match) {
    const [, dia, mes, ano, nome] = match;
    return {
      fornecedor: nome.trim(),
      data: new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia))),
    };
  }

  // Sem data reconhecível (ex: só o nome do fornecedor, ou um typo de data que
  // não bate com nenhum padrão) — preserva o texto original como nome, sem adivinhar.
  return { fornecedor: str.replace(/:$/, '').trim(), data: null };
}

function jaMigrado(ultimosFornecedores) {
  return ultimosFornecedores.every((item) => typeof item === 'object' && item !== null);
}

async function main() {
  const aplicar = process.argv.includes('--apply');

  await mongoose.connect(process.env.MONGO_URI);
  const collection = mongoose.connection.db.collection('pacientes');

  const cursor = collection.find({
    ultimosFornecedores: { $exists: true, $type: 'array', $ne: [] },
  });

  let totalDocumentos = 0;
  let totalJaMigrados = 0;
  let totalAMigrar = 0;
  const semDataReconhecida = [];

  for await (const doc of cursor) {
    totalDocumentos++;

    if (jaMigrado(doc.ultimosFornecedores)) {
      totalJaMigrados++;
      continue;
    }

    totalAMigrar++;
    const migrado = doc.ultimosFornecedores
      .map(parseUltimoFornecedor)
      .sort((a, b) => {
        if (!a.data && !b.data) return 0;
        if (!a.data) return 1;
        if (!b.data) return -1;
        return b.data - a.data;
      });

    console.log(`${aplicar ? '[APLICANDO]' : '[DRY-RUN]'} ${doc.nome} (cpf ${doc.cpf}):`);
    console.log('  antes:', JSON.stringify(doc.ultimosFornecedores));
    console.log('  depois:', JSON.stringify(migrado));

    migrado.forEach((item) => {
      if (!item.data) {
        semDataReconhecida.push({ paciente: doc.nome, cpf: doc.cpf, fornecedor: item.fornecedor });
      }
    });

    if (aplicar) {
      await collection.updateOne({ _id: doc._id }, { $set: { ultimosFornecedores: migrado } });
    }
  }

  console.log('---');
  console.log(`Total de documentos com ultimosFornecedores não vazio: ${totalDocumentos}`);
  console.log(`Já estavam no formato novo (pulados): ${totalJaMigrados}`);
  console.log(`${aplicar ? 'Migrados agora' : 'Seriam migrados (rode com --apply para aplicar)'}: ${totalAMigrar}`);

  if (semDataReconhecida.length > 0) {
    console.log('---');
    console.log(`ATENÇÃO: ${semDataReconhecida.length} entrada(s) sem data reconhecida — revisar manualmente depois pela tela de edição:`);
    semDataReconhecida.forEach((item) => {
      console.log(`  - ${item.paciente} (cpf ${item.cpf}): "${item.fornecedor}"`);
    });
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
