# nest-clean-blueprint

> **Bootstrap reference architecture for new NestJS backends.**
> Strict layered architecture, Result-based error handling, Zod-validated I/O, presenter-shaped responses, and shared providers (mail, encrypt-decrypt, upload). Ships with an MCP server so AI agents can always consult the latest guidance.

---

## 🏗️ O que é

Este repositório **não é um framework**. É um **bootstrap** — um esqueleto de projeto NestJS contendo:

- Classes base (`Result`, `AbstractRepository`, `AbstractService`, `AbstractPresenter`, `AbstractEventListener`, `ILogger`, `AsyncContext`).
- Infra compartilhada (middlewares, pipes, decorators, exceptions).
- 3 providers prontos (AWS SES + EJS, Node `crypto`, AWS S3).
- 1 módulo de exemplo (`orders`) demonstrando **todos** os patterns end-to-end.
- Templates `.hbs` para scaffolding rápido de novos módulos.
- Documentação completa em `docs/`.
- Servidor MCP em `mcp-server/` que expõe tudo isso como tools para agentes de IA.

A intenção é que novos projetos **clonem este repositório** ou **consultem-no via MCP** ao invés de copiar manualmente código de projetos antigos.

---

## 🚀 Como usar

### Opção A — clonar como ponto de partida

```bash
git clone https://github.com/<owner>/nest-clean-blueprint.git my-new-api
cd my-new-api
rm -rf .git && git init
pnpm install
cp .env.example .env   # ajuste credenciais
pnpm start:dev
```

Em seguida:

1. Renomeie/remova o módulo de exemplo `src/modules/_example_orders/`.
2. Crie seus próprios módulos consultando `docs/conventions/module-structure.md`.
3. Use os templates em `templates/` para scaffolding (manualmente ou via plop/hygen).

### Opção B — consultar via MCP (recomendado para times com IA)

Mantenha este repositório como **fonte da verdade**. Cada projeto novo apenas registra o servidor MCP no editor (Copilot / Claude / Cursor) e consulta as diretrizes em tempo real.

Veja a seção [🔌 Integração MCP](#-integração-mcp) abaixo.

---

## 🤖 Squad como Orquestrador Principal de AI Agents

Este blueprint foi pensado para times que usam **múltiplos agentes de IA** trabalhando em paralelo. Recomendamos o [**Squad**](https://github.com/bradygaster/squad-cli) como orquestrador padrão.

### Por que Squad

- Coordena agentes em paralelo (background) com fila de trabalho.
- Padrão de "memória" por agente (`charter.md` + `history.md`).
- Decisões arquiteturais centralizadas (`decisions.md`).
- Skills reutilizáveis em `.copilot/skills/` e `.squad/skills/`.
- Integração nativa com GitHub Issues + PRs.

### Setup recomendado

Em qualquer projeto que use este blueprint:

```bash
npx @bradygaster/squad-cli init
```

Quando o Squad perguntar pela composição da equipe, sugerimos os seguintes papéis:

| Papel | Responsabilidade |
|---|---|
| 🏗️ **Lead** | Triagem de issues, design arquitetural, code review, garantir conformidade com este blueprint |
| 🔧 **Backend Dev** | Implementar services, controllers, repositories seguindo Result + ZodValidationPipe + Presenter |
| 🧪 **Tester** | Escrever unit + E2E, validar erros por `instanceOf`, manter cobertura |
| 📋 **Scribe** | (sempre presente) Memória, decisões, logs de sessão |

### Skill recomendada

Adicione uma skill `nest-clean-blueprint` em `.copilot/skills/` apontando para este MCP server. Assim **todo agente** consulta os patterns automaticamente:

```markdown
---
name: nest-clean-blueprint
description: REQUIRED for any NestJS backend code. ALWAYS load before creating a service, writing a controller, adding a repository, building a module. Consult MCP `nest-clean-blueprint` for the latest patterns.
---

Antes de implementar qualquer código:
1. `get_blueprint` — leia o blueprint completo.
2. `get_pattern <nome>` — consulte o pattern relevante.
3. `get_template <layer>` — use o template ao criar arquivos.
4. `get_checklist` antes de abrir o PR.
```

---

## 🔌 Integração MCP

O servidor MCP em `mcp-server/` expõe os documentos e templates deste repositório como **tools** consumíveis por qualquer cliente compatível (GitHub Copilot, Claude Desktop/Code, Cursor, Continue, etc).

### Build

```bash
cd mcp-server
pnpm install
pnpm build
```

### Configuração (exemplo `.mcp.json`)

```json
{
  "mcpServers": {
    "nest-clean-blueprint": {
      "command": "node",
      "args": ["/abs/path/to/nest-clean-blueprint/mcp-server/dist/index.js"]
    }
  }
}
```

### Tools disponíveis

| Tool | O que retorna |
|---|---|
| `get_blueprint` | `docs/ARCHITECTURE-BLUEPRINT.md` completo |
| `list_patterns` / `get_pattern <name>` | Patterns: result-pattern, dependency-injection, pagination, async-context, event-driven |
| `list_conventions` / `get_convention <name>` | naming, module-structure, testing |
| `list_providers` / `get_provider_docs <name>` | mail-provider, encrypt-decrypt-provider, upload-provider |
| `list_templates` / `get_template <layer>` | Scaffolding `.hbs`: service, controller, repository, presenter, entity, dto, exception, module |
| `get_email_template_example` | Welcome EJS + partials (header/footer) |
| `get_checklist` | Checklist obrigatório de PR |
| `validate_module_structure <path>` | Verifica se um módulo segue o layout obrigatório |

### Pin de versão

Em produção, faça checkout de uma **tag** (ex: `v1.0.0`) e aponte o MCP para esse caminho. Atualizações nas diretrizes só chegam após o time fazer um `pull` consciente.

---

## 📐 Patterns documentados

Documentação completa em [`docs/`](./docs/):

- [📘 ARCHITECTURE-BLUEPRINT.md](./docs/ARCHITECTURE-BLUEPRINT.md) — visão geral
- Patterns:
  - [Result pattern](./docs/patterns/result-pattern.md)
  - [Dependency Injection via abstract tokens](./docs/patterns/dependency-injection.md)
  - [Pagination](./docs/patterns/pagination.md)
  - [AsyncContext (correlation ID)](./docs/patterns/async-context.md)
  - [Event-driven communication](./docs/patterns/event-driven.md)
- Conventions:
  - [Naming](./docs/conventions/naming.md)
  - [Module structure](./docs/conventions/module-structure.md)
  - [Testing](./docs/conventions/testing.md)
- Providers:
  - [Mail (AWS SES + EJS + partials)](./docs/providers/mail-provider.md)
  - [Encrypt/Decrypt (Node crypto)](./docs/providers/encrypt-decrypt-provider.md)
  - [Upload (AWS S3)](./docs/providers/upload-provider.md)
- [✅ Checklist obrigatório de PR](./docs/checklist-pr.md)

---

## 🧱 Classes base disponíveis

Em [`src/@shared/`](./src/@shared/):

| Classe / Token | Arquivo | Função |
|---|---|---|
| `Result<T>` | `classes/result.ts` | Container de sucesso/erro retornado por todo service |
| `AbstractRepository<E, M>` | `classes/repository.ts` | CRUD + paginação sobre TypeORM |
| `AbstractService<Dto, R>` | `classes/service.ts` | Contrato `execute(dto, context?)` |
| `AbstractPresenter<M, R>` | `classes/presenter.ts` | `present` / `presentMany` / `presentWithoutRelations` |
| `AbstractEventListener<Dto>` | `classes/event-listener.ts` | Contrato `handle(event)` para `@OnEvent` |
| `ILogger` / `CustomLogger` | `classes/custom-logger.ts` | Log estruturado com correlation ID |
| `AsyncContext` | `classes/async-context.ts` | AsyncLocalStorage para requestId/userId/timezone |
| `AbstractApplicationException` | `errors/abstract-application-exception.ts` | Base de toda exception customizada |
| `ZodValidationPipe` | `pipes/zod-validation.pipe.ts` | Pipe de validação inline em `@Body/@Query/@Param` |
| `RequestIdMiddleware` | `middlewares/request-id.middleware.ts` | Semeia correlation ID por request |
| `@ReqContext()` | `@decorators/request-context.decorator.ts` | Constrói `IRequestContext` no controller |
| `@User()` | `@decorators/current-user.decorator.ts` | Extrai usuário autenticado |

---

## 📦 Providers compartilhados

Em [`src/@shared/providers/`](./src/@shared/providers/):

- **mail-provider** — AWS SES com renderização EJS e suporte a partials (`<%- include('partials/header') %>`).
- **encrypt-decrypt-provider** — Node `crypto` configurável (algoritmo + key + IV via env).
- **upload-provider** — AWS S3 com URLs pré-assinadas; `storageId` (`<bucket>/<key>`) round-trip.

Cada provider expõe um token abstrato (`TMailProvider`, `TEncryptDecryptProvider`, `TUploadProvider`) — basta `imports: [<X>ProviderModule]` e injetar.

---

## 🛠️ Templates de scaffolding

Em [`templates/`](./templates/) (Handlebars `.hbs`):

| Template | Para criar |
|---|---|
| `service.ts.hbs` | Service com `T...Service` + `execute` retornando `Result<T>` |
| `controller.ts.hbs` | Controller com path completo + `ZodValidationPipe` inline + presenter |
| `repository.ts.hbs` | Repository extendendo `AbstractRepository` |
| `presenter.ts.hbs` | Presenter com `present` / `presentMany` |
| `entity.ts.hbs` | Entity TypeORM com colunas snake_case + soft delete |
| `dto.ts.hbs` | Schema Zod + type alias |
| `exception.ts.hbs` | Exception extendendo `AbstractApplicationException` |
| `module.ts.hbs` | Module com `useClass` para todos os tokens |

Placeholders: `{{Name}}`, `{{name}}`, `{{Entity}}`, `{{entity}}`, `{{EntitiesPlural}}`, `{{entitiesPlural}}`, `{{entities-plural}}`, `{{Action}}`, `{{action}}`.

---

## ✅ Checklist obrigatório de PR

Veja [`docs/checklist-pr.md`](./docs/checklist-pr.md). Reviewers devem rejeitar PRs que falhem qualquer item.

Resumo:

- Services retornam `Result<T>`, **nunca** lançam exceptions
- Apenas controllers lançam (e anexam `context` antes)
- Toda entrada validada com `ZodValidationPipe` inline
- Path completo em `@Controller`, decorators HTTP vazios
- List services retornam `IPagination<T>` e injetam `TEnvService`
- Migrations criadas manualmente (`migration:create`, **nunca** `:generate`)
- Erros testados via `toBeInstanceOf`, nunca por mensagem
- `pnpm check && pnpm lint && pnpm test:unit` passam

---

## 🏷️ Versionamento

Este repositório segue **SemVer**. Cada release ganha uma tag git (`v1.0.0`, `v1.1.0`, ...).

Quando consumir via MCP em projetos críticos:

1. Faça checkout de uma tag específica.
2. Aponte o MCP para esse caminho.
3. Atualize só após revisar o `CHANGELOG.md`.

---

## 🤝 Contribuindo

1. Abra uma issue descrevendo a mudança proposta no pattern / convention / provider.
2. Mudanças que quebram patterns existentes exigem **discussão prévia** + entrada em `CHANGELOG.md` na seção `BREAKING CHANGES`.
3. Toda nova diretriz precisa estar refletida em **três lugares**:
   - Documento em `docs/`
   - Exemplo no módulo `_example_orders/` (quando aplicável)
   - Tool no servidor MCP (quando for nova categoria)
4. Rode o checklist de PR antes de marcar como ready for review.

---

## 📄 Licença

MIT — veja [LICENSE](./LICENSE).
