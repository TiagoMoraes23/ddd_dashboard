# ADR 005: Exportação de planilha — separação entre query, regra de negócio e geração de arquivo

## Status
Aceito

## Contexto

O backend legado pré-DDD (`backend/controllers/pacienteController.js`), órfão, tinha duas funções de exportação (`exportarCirurgias`, `GET /api/cirurgias/exportar`, e `exportPacientes`, `GET /pacientes/export`) que nunca foram portadas para o backend v2 depois da virada para DDD. O botão "Exportar Planilha" ficou no frontend (`SurgeryResultsTable.jsx`) chamando um `handleExport` que só mostrava um alerta.

Inspecionando o código legado para portar a funcionalidade, cada uma dessas funções de exportação concentrava, num único bloco de código, três responsabilidades distintas:
1. **Construção da query/agregação MongoDB** (filtros de fornecedor, convênio, data, status, `$lookup`/`$group` por paciente) — regra de acesso a dado.
2. **Regra de negócio de agrupamento** (uma linha por paciente, cirurgias de cada paciente concatenadas na mesma célula com `;`) — regra de apresentação de domínio, não de banco nem de arquivo.
3. **Geração do arquivo `.xlsx`** via `exceljs` (definição de colunas, formatação de data, `wrapText`) e escrita direta na resposta HTTP — infraestrutura de saída.

Essa mistura é exatamente o antipadrão que o restante do projeto já vinha corrigindo desde o ADR 001 (Agregados/Repositórios) e a reativação do CQRS nos módulos `pacientes`/`cirurgias`/`dashboard`: lógica de banco, regra de negócio e apresentação inline numa única função tornam o código difícil de testar isoladamente (não dá pra testar "o agrupamento por paciente está certo" sem subir um banco real e sem gerar um arquivo Excel de verdade) e difícil de reaproveitar (a mesma agregação de busca de cirurgias já existia duplicada entre a rota `/buscar` e a rota de exportação, no legado).

## Decisão

Ao portar a exportação para o backend v2 (módulo novo `relatorios`), a funcionalidade foi deliberadamente dividida em quatro camadas, cada uma com uma única responsabilidade e testável isoladamente:

1. **Query (acesso a dado)** — `backend/src/modules/cirurgias/queries/BuscarCirurgiasQuery.js`. Não é uma classe nova criada só para a exportação: é a mesma agregação já usada pela busca avançada de cirurgias (`GET /api/v2/cirurgias/buscar`), extraída do que antes era código inline na rota para uma classe reaproveitável, exatamente o reaproveitamento que faltava no legado. A extração só acrescentou dois campos (`pacienteDataRnm`, `pacienteUltimosFornecedores`) que a exportação precisa e a busca em tela não.
2. **Regra de negócio (use case)** — `backend/src/modules/relatorios/useCases/ExportarCirurgias/ExportarCirurgiasUseCase.js`. Contém *só* a regra de "como combinar os resultados de paciente e de cirurgia, e como agrupar cirurgias achatadas em uma linha por paciente", não sabe nada de MongoDB (recebe as queries já prontas por injeção de dependência) nem de Excel. Testado com mocks das duas queries (`jest.fn()`), sem precisar de banco nem de gerar arquivo algum.
3. **Geração de arquivo (função pura)** — `backend/src/shared/infra/excel/gerarPlanilhaCirurgias.js`. Recebe só dados já formatados (as linhas produzidas pelo use case) e devolve um `Workbook` do `exceljs`, zero dependência de banco, zero regra de negócio (não decide como agrupar, só como desenhar a planilha a partir do que já chegou agrupado). Testado lendo o workbook célula a célula, sem subir servidor nem banco.
4. **Controller (HTTP)** — `backend/src/modules/relatorios/infra/http/controllers/ExportarCirurgiasController.js`. Só entende requisição/resposta: faz o parse defensivo dos filtros vindos da querystring, chama o use case, chama o gerador de planilha, escreve os headers e o stream do arquivo. Não contém agregação nem regra de agrupamento.

Essa é a mesma disciplina de separação já aplicada aos módulos `pacientes`/`cirurgias` (Repository/UseCase/Controller), estendida aqui para uma quarta camada explícita (geração de arquivo) porque a exportação, diferente de um CRUD comum, tem uma responsabilidade de "formato de saída" que não existe nos outros módulos e que merece seu próprio limite.

## Consequências

### Positivas:
- **Zero duplicação de lógica de busca**: a exportação usa exatamente as mesmas duas queries (`BuscarPacientesQuery`, `BuscarCirurgiasQuery`) que a tela de busca já usa. A planilha gerada reflete garantidamente o mesmo resultado que apareceu em tela para os mesmos filtros, porque não existe uma terceira implementação de filtro que possa divergir.
- **Testabilidade por camada**: a regra de agrupamento por paciente foi coberta por 7 testes unitários com mocks, sem tocar banco nem gerar um único arquivo `.xlsx` real; a geração da planilha foi coberta por 4 testes que leem células de um workbook em memória, sem tocar banco. No legado, testar qualquer uma dessas regras exigiria rodar a função inteira (banco + agregação + geração de arquivo juntos).
- **Reaproveitável para exportações futuras**: se um dia for necessário exportar em outro formato (CSV, PDF) ou adicionar uma exportação de pacientes "puros" (sem cirurgia), só a camada 3 (geração de arquivo) muda, as camadas de query e regra de negócio continuam as mesmas.

### Negativas / Mitigações:
- **Mais arquivos para uma única feature** (4 camadas + testes, contra 1 função no legado) — trade-off aceito conscientemente: o ganho de testabilidade e reaproveitamento supera o custo de navegação entre arquivos, mesma decisão já tomada em todos os outros módulos do projeto.
- **Coluna "Região Cirurgias" não existe no legado**: adicionada porque o dado só ficou limpo/normalizado depois da migração da Fase 6b (ADR 004), o legado nunca teve uma forma confiável de expor isso numa planilha. Não é uma regressão de paridade, é uma melhoria possibilitada por trabalho posterior ao legado.
