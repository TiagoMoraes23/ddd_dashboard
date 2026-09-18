# ADR 004: Migração física de Cirurgia para coleção standalone

## Status
Aceito

## Contexto

O ADR 001 já havia decidido separar `Paciente` e `Cirurgia` em Agregados independentes. Antes da migração física dos dados acontecer, porém, todos os Read Models continuavam lendo o array embutido `pacientes.cirurgias`, e a coleção `cirurgias` separada (que já existia, com schema, repositório e `AgendarCirurgiaUseCase` funcionais) ficava sem uso real, vazia.

Essa migração ficou pendente por várias fases. Ao investigar o que faltava para executá-la, veio à tona que não se tratava apenas de dívida arquitetural planejada — havia um **bug real de perda de dado silenciosa**, encontrado em ambiente de desenvolvimento antes de o backend `ddd` ter qualquer uso operacional real pela clínica (o sistema em produção, usado pela equipe, continuava sendo a branch legada pré-DDD nesse período):

- `Paciente.atualizarDados()` nunca desestruturava `cirurgias`, e `PacienteRepository.salvar()` nunca incluía `cirurgias` no `$set` do upsert. Resultado: todo `PUT /api/v2/pacientes/:cpf` e `POST /api/v2/pacientes` desde a virada para o backend DDD **ignorava completamente** o array `cirurgias` enviado pelo `PacienteForm.jsx` — qualquer cirurgia nova ou editada por quem testasse o formulário simplesmente não era salva, sem erro nenhum na tela. Como o `ddd` ainda não estava em produção, **nenhum dado real de paciente chegou a ser perdido**; o bug teria causado perda real caso o sistema estivesse em uso operacional nesse estado, o que motivou tratá-lo com a mesma seriedade de um incidente de produção.
- As ~332 cirurgias reais existentes eram resíduo congelado do backend legado pré-DDD (`pacienteController.js`, que fazia um `findOneAndUpdate({cpf}, req.body)` bruto, sobrescrevendo o documento inteiro) — ou seja, retratavam o estado do banco *antes* da virada para o DDD, não o uso real desde então.
- As rotas dedicadas de cirurgia (`POST`/`PATCH /api/v2/cirurgias*`) existiam no Express mas eram código morto: nenhum botão do frontend as chamava, e `AtualizarStatusCirurgiaUseCase` sequer usava os métodos reais do repositório (`findById`/`save`, que não existem — os nomes reais são `buscarPorId`/`salvar`), então religar essas rotas sem corrigi-las apenas trocaria um bug silencioso por um 500 explícito.
- Foram encontrados outros defeitos adjacentes durante a auditoria: um arquivo de schema duplicado e órfão (`useCases/AgendarCirurgia/CirurgiaSchema.js`, nunca `require`ado); `StatusCirurgia` (VO) rejeitando o valor canônico real `'Cancelado (outro motivo)'` (só aceitava `'Cancelado'`); o campo `regiao`, usado pelo formulário, não existindo em nenhum dos dois schemas de cirurgia.

Ou seja, terminar a migração do ADR 001 deixou de ser só "fechar uma dívida decidida" e passou a ser a correção de um bug real de perda de dado.

## Decisão

Migrar fisicamente os dados de `pacientes.cirurgias` (array embutido) para a coleção `cirurgias` standalone já existente, e trocar toda a aplicação (leituras e escritas) para operar sobre ela — em 4 sub-fases sequenciais, cada uma testada e commitada isoladamente:

**6a — Fundação no backend**, sem tocar em dado de produção: adicionado `regiao` (`[String]`, ver abaixo) ao schema/entidade de `Cirurgia`; removido o schema órfão duplicado; adicionados `CirurgiaRepository.buscarPorId()`/`deletar()`; `AtualizarStatusCirurgiaUseCase` corrigido para usar os métodos reais do repositório; `AgendarCirurgiaUseCase` relaxado (data/horário deixam de ser obrigatórios, status deixa de ser fixado em `'Agendado'`) para bater com o uso real do formulário (cirurgia pode existir em estágio inicial sem data marcada); novos `AtualizarCirurgiaUseCase`/`DeletarCirurgiaUseCase` + rotas `PUT`/`DELETE /api/v2/cirurgias/:id`. `StatusCirurgia` corrigido para aceitar `'Cancelado (outro motivo)'`.

**6b — Migração de dado real**, com três salvaguardas antes de qualquer execução real:
1. **Backup redundante**: além do script ser não-destrutivo por construção (só lê o array embutido, nunca apaga), foi feito um `mongodump` completo da coleção `pacientes` antes do `--apply` — duas camadas de segurança, não uma.
2. **Normalização de `regiao`** via dicionário explícito construído a partir dos 52 valores brutos reais distintos observados no banco (não regex genérico): variações de lateralidade (`direito`/`esquerdo`/`d`/`e`/`d+e`) descartadas, plurais colapsados, `cervical`/`dorsal`/`lombar` mapeados para `Coluna`. Durante a revisão do dry-run, um padrão real de múltiplas articulações tratadas na mesma cirurgia (`"Ombros e cotovelos"`, `"cervical e ombro"`, etc.) levou à decisão de tornar `regiao` um **array** (`[String]`, não `String`) — mesmo precedente já usado para `fornecedor` (atual) do paciente, em vez de forçar uma escolha única ou marcar tudo como ambíguo. Qualquer valor fora do dicionário foi reportado para decisão manual, não adivinhado; sobrou um único caso genuinamente ambíguo, resolvido manualmente.
3. **Horário embutido em texto livre**: como o campo `horario` foi adicionado tardiamente ao schema, 40 cirurgias reais tinham o horário apenas como texto solto dentro da descrição/observação (ex. "horario 11h"). O script extrai esse valor automaticamente apenas quando o padrão é inequívoco; qualquer ambiguidade cai em lista de revisão manual, e o texto original nunca é alterado ou apagado, só lido.

O script (`migrarCirurgiasEmbutidas.js`) segue o mesmo padrão dry-run + `--apply` já usado em `migrarFornecedorAtual.js`/`migrarUltimosFornecedores.js`, com guarda de re-execução (recusa `--apply` se a coleção destino já não estiver vazia). Resultado real: 332 cirurgias de 181 pacientes migradas; array embutido original **preservado intacto** no Mongo (não apagado nesta fase).

**6c — Leituras**: `cirurgias.routes.js` (`/buscar`), `ObterEstatisticasDashboardQuery`, `BuscarPacientesPorKpiQuery` e `BuscarPacientesQuery` trocados para consultar a coleção `cirurgias` via `$lookup`, eliminando a leitura interina do array embutido. Um bug real de tipo foi encontrado e corrigido aqui: `cirurgia.pacienteId` é sempre `String`, mas o `_id` de paciente é um `ObjectId` nativo para a maioria dos registros reais (declarar o schema como `String`, desde a Fase 1, não converte retroativamente dado já existente — `_id` é imutável no MongoDB). Um `$lookup` com `localField`/`foreignField` direto não batia; corrigido em todos os 4 arquivos usando `$expr: { $eq: [{ $toString: '$_id' }, pacienteId] }`. Essa é a mesma classe de bug já corrigida uma vez na Fase 2 (reentrada por CPF em vez de `_id`), reintroduzida aqui por assumir, sem verificar, que aquele fix já era universal.

**6d — Escrita no frontend**: `PacienteForm.jsx` para de embutir `cirurgias` no payload de `PUT`/`POST /api/v2/pacientes`; cada linha de cirurgia ganha identidade estável (`_id` quando já persistida) e o submit é dividido em `criar`/`atualizar`/`apagar`, disparando `POST`/`PUT`/`DELETE /api/v2/cirurgias` depois que o paciente é salvo. Isso fecha o bug de perda de dado descrito no Contexto.

## Consequências

### Positivas:
- **Bug de perda de dado corrigido antes de qualquer exposição real**: cirurgias criadas/editadas pelo formulário agora persistem de verdade. Antes eram descartadas silenciosamente desde a virada para o backend DDD — mas o `ddd` ainda estava restrito a ambiente de desenvolvimento nesse período, então nenhum dado real de paciente foi afetado.
- **ADR 001 finalmente completado**: a arquitetura de Agregados independentes, decidida havia várias fases, passa a refletir a realidade dos dados e do código, não só do desenho.
- **Leitura interina eliminada**: os Read Models voltam a ter uma única fonte de verdade (a coleção `cirurgias`), fechando a duplicidade de modelagem que existia enquanto a migração física não tinha acontecido.
- **`regiao` como array** resolve, sem perda de informação, um caso de negócio real (múltiplas articulações na mesma cirurgia) que a modelagem anterior (campo inexistente) nem sequer capturava.
- **Auditoria proveitosa**: o processo encontrou e corrigiu, ao vivo contra dado real, um bug de perda de dado silenciosa, um bug de tipo BSON reincidente, um VO rejeitando o valor canônico real, e um arquivo órfão duplicado, material concreto para o argumento de "cobertura de teste não garante corretude, verificação contra dado real sim".

### Negativas / Mitigações:
- **Estratégia de rollback**: caso um problema seja encontrado depois do `--apply`, a reversão é reverter os commits das sub-fases 6a–6d; como o array embutido original nunca foi apagado, nenhum dado é perdido mesmo num rollback completo, a coleção `cirurgias` standalone recém-criada seria simplesmente ignorada de novo (voltando à leitura interina do array embutido).
- **`regiao` como array** exige que qualquer código futuro que trate região trate-a como lista, não como valor único — divergência de forma em relação a campos como `hospital`/`fornecedor` (da cirurgia), que continuam `String`.

## Critério de sucesso (verificado ao vivo antes de considerar a fase encerrada)
- Contagem de cirurgias migradas bate com a contagem original (332 de 181 pacientes).
- `/stats` do dashboard e a busca por fornecedor retornam exatamente os mesmos números registrados antes de qualquer migração (79 pacientes), confirmando que a troca de fonte de dado não alterou nenhum resultado.
- Teste de fumaça de ponta a ponta via navegador real (Playwright, dados descartáveis): criar paciente com cirurgia → reabrir em edição (cirurgia pré-preenchida corretamente) → adicionar 2ª região + nova cirurgia → apagar uma cirurgia — cada etapa confirmada via API que a mudança persistiu de verdade no banco, não só na tela.
- Suíte automatizada verde a cada sub-fase (33/33 suítes, 188/188 testes ao final da 6c; 6d não alterou nenhum arquivo de backend).
