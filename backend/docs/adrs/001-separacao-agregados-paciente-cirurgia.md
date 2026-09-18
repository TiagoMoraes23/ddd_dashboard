# ADR 001: Separação dos Agregados Paciente e Cirurgia

## Status
Aceito

## Contexto
No MVP legado construído sobre Mongoose/MongoDB, a entidade `Paciente` estava modelada como um grande documento que continha um array embutido (embedded document) com o histórico de `Cirurgias`. 
Embora essa seja uma modelagem comum em bancos NoSQL para minimizar queries, ela se mostrou insustentável para a complexidade de negócios sob a ótica do DDD:
1. **Falta de Limites de Transação (Consistency Boundaries)**: Alterar o status de uma cirurgia bloqueava/atualizava toda a entidade Paciente.
2. **Ciclos de Vida Distintos**: O ciclo cadastral de um paciente (ex: validar CPF, checar vencimento da RNM) é completamente separado do agendamento e realização de uma cirurgia.
3. **Vazamento de Regras**: Regras pertinentes apenas ao universo cirúrgico estavam inchando as validações do modelo de pacientes.

## Decisão
Aplicando os conceitos de Domain-Driven Design (DDD), decidimos separar `Paciente` e `Cirurgia` em **Agregados Independentes (Aggregate Roots)**. 
A partir de agora:
- O módulo `Pacientes` detém responsabilidade exclusiva sobre dados e comportamentos vitais da pessoa.
- O módulo `Cirurgias` deterá sua própria coleção e ciclo de vida, possuindo um identificador de referência `pacienteId`.

## Consequências

### Positivas:
- **Coesão e Imutabilidade:** As Entidades de Domínio agora têm escopo estrito, facilitando a criação de Objetos de Valor (Value Objects) e a cobertura de testes de unidade sem *mockar* estruturas gigantes.
- **Escalabilidade:** Impede o risco arquitetural de o documento do Paciente ultrapassar o limite físico de 16MB do MongoDB no futuro (BSON Document Size Limit).
- **Independência:** Possibilita que futuras funcionalidades da Cirurgia (ex: adicionar múltiplos médicos, insumos) evoluam sem impacto direto no modelo de Paciente.

### Negativas / Mitigações:
- **Consultas Complexas:** Perdemos a conveniência de buscar "pacientes com todas as suas cirurgias" em uma única leitura trivial (O(1)).
- **Mitigação:** Este problema será endereçado futuramente por meio da composição no Controller HTTP ou, eventualmente, pela adoção do padrão CQRS criando Read Models (Views Materializadas) específicas para as interfaces de front-end.