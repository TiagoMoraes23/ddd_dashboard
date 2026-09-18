const mongoose = require('mongoose');
const dotenv = require('dotenv');

const PacienteModel = require('./src/modules/pacientes/infra/database/mongoose/PacienteSchema');
const PacienteRepository = require('./src/modules/pacientes/infra/repositories/PacienteRepository');
const CriarPacienteUseCase = require('./src/modules/pacientes/useCases/CriarPaciente/CriarPacienteUseCase');

const CirurgiaModel = require('./src/modules/cirurgias/infra/database/mongoose/CirurgiaSchema');
const CirurgiaRepository = require('./src/modules/cirurgias/infra/repositories/CirurgiaRepository');
const VerificadorConflitoDomainService = require('./src/modules/cirurgias/domain/VerificadorConflitoDomainService');
const AgendarCirurgiaUseCase = require('./src/modules/cirurgias/useCases/AgendarCirurgia/AgendarCirurgiaUseCase');

dotenv.config();

const pacienteRepository = new PacienteRepository(PacienteModel);
const criarPacienteUseCase = new CriarPacienteUseCase(pacienteRepository);

const cirurgiaRepository = new CirurgiaRepository();
const verificadorConflito = new VerificadorConflitoDomainService(cirurgiaRepository);
const agendarCirurgiaUseCase = new AgendarCirurgiaUseCase(cirurgiaRepository, verificadorConflito);

const NUM_PACIENTES = 18;

const nomesMasculinos = ['João', 'Pedro', 'Lucas', 'Marcos', 'Rafael', 'Bruno', 'Eduardo', 'Felipe', 'Gustavo', 'Rodrigo', 'André', 'Carlos', 'Daniel', 'Diego', 'Fernando'];
const nomesFemininos = ['Maria', 'Ana', 'Beatriz', 'Camila', 'Fernanda', 'Juliana', 'Larissa', 'Patrícia', 'Renata', 'Vanessa', 'Aline', 'Bianca', 'Carla', 'Débora', 'Elaine'];
const sobrenomes = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Barbosa'];

const convenios = ['Particular', 'Convênio A', 'Convênio B', 'Convênio C', 'Convênio D'];
const fornecedores = ['Fornecedor Ortopédico Alfa', 'Fornecedor Ortopédico Beta', 'Fornecedor Ortopédico Gama', 'Fornecedor Ortopédico Delta'];
const hospitais = ['Hospital Modelo', 'Hospital Central Fictício', 'Clínica Ortopédica Exemplo', 'Hospital Referência Teste'];
const regioesPossiveis = [
  ['Joelho direito'],
  ['Joelho esquerdo'],
  ['Ombro direito'],
  ['Ombro esquerdo'],
  ['Quadril direito'],
  ['Quadril esquerdo'],
  ['Coluna lombar'],
  ['Cotovelo direito'],
  ['Tornozelo esquerdo'],
  ['Ombro direito', 'Cotovelo direito'],
];
const descricoesPossiveis = ['Artroscopia', 'Substituição de prótese', 'Reconstrução ligamentar', 'Artroplastia', 'Osteossíntese', 'Liberação de túnel'];
const opmePossiveis = ['Prótese total', 'Placa e parafusos', 'Âncoras de sutura', 'Haste intramedular', 'Parafuso de interferência'];
const statusPossiveis = ['Autorizado', 'Agendamento Pendente', 'Agendado', 'Realizado', 'Cancelado (outro motivo)', 'Senha expirada'];
const horariosPossiveis = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(lista) {
  return lista[randomInt(0, lista.length - 1)];
}

function calcularDigitoVerificador(digitos, pesoInicial) {
  const soma = digitos.reduce((total, digito, indice) => total + digito * (pesoInicial - indice), 0);
  const resto = (soma * 10) % 11;
  return resto >= 10 ? 0 : resto;
}

function gerarCpf(cpfsUsados) {
  let cpf;
  do {
    const base = Array.from({ length: 9 }, () => randomInt(0, 9));
    const d1 = calcularDigitoVerificador(base, 10);
    const d2 = calcularDigitoVerificador([...base, d1], 11);
    cpf = [...base, d1, d2].join('');
  } while (/^(\d)\1{10}$/.test(cpf) || cpfsUsados.has(cpf));
  cpfsUsados.add(cpf);
  return cpf;
}

function gerarNome() {
  const primeiroNome = Math.random() < 0.5 ? randomItem(nomesMasculinos) : randomItem(nomesFemininos);
  return `${primeiroNome} ${randomItem(sobrenomes)} ${randomItem(sobrenomes)}`;
}

function gerarTelefone() {
  const ddd = randomInt(11, 99);
  const numero = randomInt(900000000, 999999999);
  return `(${ddd}) ${String(numero).slice(0, 5)}-${String(numero).slice(5)}`;
}

function gerarDataRnm() {
  const cenario = randomInt(1, 10);
  if (cenario <= 4) return null;
  const hoje = new Date();
  const meses = cenario <= 7 ? randomInt(1, 6) : randomInt(13, 24);
  const data = new Date(hoje);
  data.setMonth(data.getMonth() - meses);
  return data;
}

let contadorFuturo = 1;
let contadorPassado = 1;

function proximaDataFutura() {
  const data = new Date();
  data.setDate(data.getDate() + 3 * contadorFuturo);
  contadorFuturo += 1;
  return data;
}

function proximaDataPassada() {
  const data = new Date();
  data.setDate(data.getDate() - 3 * contadorPassado);
  contadorPassado += 1;
  return data;
}

function gerarDadosAgendamento(status) {
  if (status === 'Agendado') return { data: proximaDataFutura(), horario: randomItem(horariosPossiveis) };
  if (status === 'Realizado' || status === 'Cancelado (outro motivo)') return { data: proximaDataPassada(), horario: randomItem(horariosPossiveis) };
  return { data: undefined, horario: undefined };
}

async function criarCirurgiasParaPaciente(pacienteId) {
  const quantidade = randomInt(0, 3);
  for (let i = 0; i < quantidade; i += 1) {
    const status = randomItem(statusPossiveis);
    const { data, horario } = gerarDadosAgendamento(status);
    await agendarCirurgiaUseCase.execute({
      pacienteId,
      status,
      data,
      horario,
      descricao: randomItem(descricoesPossiveis),
      opme: randomItem(opmePossiveis),
      fornecedor: randomItem(fornecedores),
      hospital: randomItem(hospitais),
      regiao: randomItem(regioesPossiveis),
    });
  }
}

async function importData() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB conectado para o seeder de demonstração...');

  await CirurgiaModel.deleteMany();
  await PacienteModel.deleteMany();
  console.log('Pacientes e cirurgias fictícios anteriores apagados...');

  const cpfsUsados = new Set();

  for (let i = 0; i < NUM_PACIENTES; i += 1) {
    const paciente = await criarPacienteUseCase.execute({
      nome: gerarNome(),
      cpf: gerarCpf(cpfsUsados),
      convenio: randomItem(convenios),
      dataRnm: gerarDataRnm(),
      contato: gerarTelefone(),
      observacoes: '',
      linkArquivos: '',
      fornecedor: [randomItem(fornecedores)],
      ultimosFornecedores: [],
    });

    await criarCirurgiasParaPaciente(paciente.id);
  }

  console.log(`${NUM_PACIENTES} pacientes fictícios (com cirurgias) importados com sucesso!`);
  process.exit();
}

async function destroyData() {
  await mongoose.connect(process.env.MONGO_URI);
  await CirurgiaModel.deleteMany();
  await PacienteModel.deleteMany();
  console.log('Todos os pacientes e cirurgias fictícios foram apagados!');
  process.exit();
}

if (process.argv[2] === '-d') {
  destroyData().catch((error) => {
    console.error(`Erro ao apagar dados: ${error.message}`);
    process.exit(1);
  });
} else {
  importData().catch((error) => {
    console.error(`Erro no seeder: ${error.message}`);
    process.exit(1);
  });
}
