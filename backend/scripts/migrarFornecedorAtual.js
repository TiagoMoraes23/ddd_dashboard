// Migra o campo `fornecedor` (fornecedor atual do paciente) de string livre
// para array de strings — o negócio é dinâmico e hoje um paciente pode ter
// mais de um fornecedor atual ao mesmo tempo (um por articulação, por
// exemplo), registrado historicamente como "Nome1 / Nome2 / Nome3" numa
// única string. Isso quebra o matching EXATO do filtro de busca (buscar por
// um fornecedor não batia quando ele aparecia combinado com outro na mesma string).
//
// Inspeção ao vivo contra o Atlas real (backend/scripts, script descartável,
// não versionado) confirmou que o separador usado é sempre "/" — sem outras
// variações — em 11 dos 320 pacientes com fornecedor preenchido.
//
// Roda direto contra a collection via driver nativo (não via Mongoose/schema)
// para não sofrer cast automático enquanto o schema ainda não foi atualizado —
// a ordem correta é: 1) migrar os dados, 2) só então atualizar PacienteSchema.js.
//
// Uso:
//   node scripts/migrarFornecedorAtual.js            (dry-run, não escreve nada)
//   node scripts/migrarFornecedorAtual.js --apply     (aplica de verdade)
require('dotenv').config();
const mongoose = require('mongoose');

function parseFornecedorAtual(valor) {
  return valor
    .split('/')
    .map((parte) => parte.trim())
    .filter((parte) => parte !== '');
}

async function main() {
  const aplicar = process.argv.includes('--apply');

  await mongoose.connect(process.env.MONGO_URI);
  const collection = mongoose.connection.db.collection('pacientes');

  const cursor = collection.find({ fornecedor: { $exists: true, $ne: null } });

  let totalDocumentos = 0;
  let totalJaMigrados = 0;
  let totalAMigrar = 0;

  for await (const doc of cursor) {
    totalDocumentos++;

    if (Array.isArray(doc.fornecedor)) {
      totalJaMigrados++;
      continue;
    }

    totalAMigrar++;
    const migrado = parseFornecedorAtual(doc.fornecedor);

    console.log(`${aplicar ? '[APLICANDO]' : '[DRY-RUN]'} ${doc.nome} (cpf ${doc.cpf}):`);
    console.log('  antes:', JSON.stringify(doc.fornecedor));
    console.log('  depois:', JSON.stringify(migrado));

    if (aplicar) {
      await collection.updateOne({ _id: doc._id }, { $set: { fornecedor: migrado } });
    }
  }

  console.log('---');
  console.log(`Total de documentos com fornecedor preenchido: ${totalDocumentos}`);
  console.log(`Já estavam no formato novo (pulados): ${totalJaMigrados}`);
  console.log(`${aplicar ? 'Migrados agora' : 'Seriam migrados (rode com --apply para aplicar)'}: ${totalAMigrar}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
