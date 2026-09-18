# DDD Dashboard — Gestão de Consultório Ortopédico

Sistema de gestão de pacientes, cirurgias e OPME de um consultório ortopédico, usado como base do Trabalho de Conclusão de Curso de Engenharia de Software USP/ESALQ. O projeto documenta a refatoração de um MVP legado para uma arquitetura orientada a domínio (DDD), com módulos isolados, CQRS leve nas consultas e um Event Bus para desacoplar efeitos colaterais (auditoria, logs).

> **Todos os dados deste repositório são fictícios.** Nenhum CPF, nome, telefone ou informação clínica aqui corresponde a uma pessoa real — veja a seção [Dados de demonstração](#dados-de-demonstração).

## Stack

- **Backend**: Node.js, Express, MongoDB/Mongoose, JWT (cookie httpOnly), Jest.
- **Frontend**: React + Vite, Tailwind CSS, Axios.

## Como rodar — via Docker (recomendado)

Pré-requisito: [Docker](https://www.docker.com/) instalado.

```bash
docker compose up --build
```

Isso sobe 4 serviços:
1. **mongo** — banco de dados.
2. **seed** — roda uma única vez, cria os usuários e popula ~18 pacientes/cirurgias fictícios, depois encerra.
3. **backend** — API em `http://localhost:5000`.
4. **frontend** — interface em `http://localhost:5173`.

Acesse `http://localhost:5173` e entre com um dos usuários de demonstração:

| Usuário | Senha    | Papel  |
|---------|----------|--------|
| admin   | admin123 | admin  |
| user    | user123  | padrao |

Para encerrar: `docker compose down` (adicione `-v` para também apagar os dados do Mongo).

## Como rodar — nativamente (sem Docker)

Pré-requisitos: Node.js 20+, uma instância MongoDB (local ou [Atlas](https://www.mongodb.com/atlas)).

### Backend

```bash
cd backend
cp .env.example .env   
npm install
npm run data:import        
npm run data:import:demo   
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env   
npm install
npm run dev
```

### Scripts úteis do backend

| Script                    | O que faz                                             |
|---------------------------|--------------------------------------------------------|
| `npm run dev`              | Sobe a API com nodemon (hot reload).                  |
| `npm test`                  | Roda a suíte de testes (Jest).                        |
| `npm run data:import`       | Cria/reseta os usuários admin e padrão.               |
| `npm run data:destroy`      | Apaga os usuários.                                    |
| `npm run data:import:demo`  | Popula pacientes e cirurgias fictícios (reseta antes).|
| `npm run data:destroy:demo` | Apaga pacientes e cirurgias fictícios.                |

## Dados de demonstração

O script `backend/seedPacientes.js` gera pacientes, CPFs, telefones e cirurgias inteiramente fictícios (nomes genéricos, CPFs matematicamente válidos mas sorteados, hospitais e fornecedores com nomes de exemplo). Ele existe só para dar contexto visual ao dashboard — nenhuma informação vem de pacientes reais, do consultório original ou de qualquer banco de produção.

## Arquitetura

O backend é dividido em módulos isolados por domínio, cada um com suas próprias camadas:

```
backend/src/modules/
├── pacientes/     — cadastro de pacientes, CPF, regra de validade da RNM (12 meses)
├── cirurgias/      — agendamento e ciclo de vida da cirurgia (agregado independente)
├── identity/       — usuários, autenticação JWT (cookie httpOnly)
├── dashboard/      — queries agregadas (KPIs) para a tela inicial
└── relatorios/     — exportação de planilhas de cirurgias
```

Cada módulo segue o padrão `domain/` (entidades e value objects) → `useCases/` (regras de aplicação) → `infra/` (controllers, rotas, repositórios Mongoose). As decisões arquiteturais mais relevantes da migração do MVP legado para essa estrutura estão documentadas em `backend/docs/adrs/`.

## Testes

```bash
cd backend
npm test
```
