# ADR 002: Módulo Dashboard como Read Model agregado, e a necessidade identificada de um módulo Identity

## Status
Aceito

## Contexto

O ADR 001 separou `Paciente` e `Cirurgia` em Agregados independentes, cada um com sua própria coleção e ciclo de vida. Essa decisão resolve bem o lado de escrita (cada aggregate root protegendo suas próprias regras).

O uso real da aplicação sempre incluiu uma tela inicial com contagens agregadas (autorizados, agendados, agendamento pendente, RNM vencida, solicitar nova RNM, reentrada) e a possibilidade de clicar em cada uma delas para ver a lista de pacientes por trás do número. Nenhuma dessas contagens é responsabilidade natural de `Paciente` (que não sabe quantas cirurgias existem por status) nem de `Cirurgia` (que não decide sozinha o que conta como "reentrada", regra que cruza cirurgia realizada há mais de 3 meses com a validade da RNM do paciente). Modelar isso como método de um dos dois agregados obrigaria um a conhecer detalhes internos do outro, ou duplicaria a regra em dois lugares.

Ao mesmo tempo, ao montar essa tela ficou evidente que ela expõe dado sensível (nome, CPF, convênio, histórico de RNM de cada paciente) sem nenhum controle de acesso: qualquer um com a URL do backend conseguia listar todos os pacientes por KPI. Diferente de `Paciente`/`Cirurgia`, que são domínio de negócio da clínica, isso é uma preocupação transversal (quem pode acessar o quê), e não fazia sentido resolver dentro do módulo `dashboard` nem duplicar em `pacientes`/`cirurgias`.

## Decisão

Criado o módulo `dashboard` como um módulo puramente de leitura (Read Model), seguindo CQRS: ele não tem agregado, nem entidade de domínio, nem comando próprio. Contém só Queries:
- `ObterEstatisticasDashboardQuery`: uma agregação por KPI, lendo direto das coleções `pacientes` e `cirurgias`.
- `BuscarPacientesPorKpiQuery`: drilldown, uma query por KPI, devolvendo a lista de pacientes por trás de cada contagem.

Diferente de `pacientes`/`cirurgias`, o módulo `dashboard` lê diretamente das coleções dos outros dois módulos (via `$lookup`/`$match`/`$group`), em vez de passar por um repositório próprio. Essa é uma quebra deliberada do isolamento estrito de bounded context defendido no ADR 001: para leitura agregada, CQRS aceita que o lado de consulta componha dado de várias fontes diretamente, contanto que nenhuma escrita aconteça por esse caminho. `dashboard` nunca escreve em `pacientes` nem em `cirurgias`.

Junto com a criação do `dashboard`, ficou registrada a necessidade de um módulo separado para autenticação e controle de acesso, cobrindo login e permissões por papel de usuário, para gatear o acesso a essa tela (e às demais rotas da aplicação). Esse módulo veio a se chamar `identity`, mas sua implementação é tratada à parte, no ADR 003.

## Consequências

### Positivas:
- **Sem inchaço de agregado**: nem `Paciente` nem `Cirurgia` precisam saber calcular estatísticas ou responder perguntas de relatório; essa responsabilidade fica isolada num módulo cuja única razão de existir é ler e agregar.
- **CQRS aplicado de forma consistente**: o mesmo padrão de "uma classe de Query por necessidade de leitura" já usado em `pacientes`/`cirurgias` se estende ao `dashboard`, mesmo sem um agregado próprio por trás.
- **Necessidade de controle de acesso identificada na origem**, e não como reação a um incidente: ao expor dado sensível agregado por KPI, ficou claro que autenticação não podia mais ficar para depois.

### Negativas / Mitigações:
- **Acoplamento de leitura entre módulos**: `dashboard` depende diretamente do formato interno das coleções `pacientes` e `cirurgias`; qualquer mudança de schema nesses dois módulos pode quebrar uma query do `dashboard` sem que isso apareça como uma dependência explícita de código (não há import de classe de domínio, só o nome da coleção). Mitigação aceita conscientemente: o custo de manter um contrato formal entre os três módulos hoje supera o benefício, dado o tamanho atual da aplicação.
- **Nenhuma escrita própria**: o módulo `dashboard` depende inteiramente de `pacientes`/`cirurgias` já terem os dados corretos; qualquer bug de escrita nesses dois se reflete direto nos KPIs, sem uma camada própria de validação no meio.
