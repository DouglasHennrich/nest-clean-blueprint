# nest-clean-blueprint

> **Bootstrap reference architecture for new NestJS backends.**
> Strict layered architecture, Result-based error handling, Zod-validated I/O, presenter-shaped responses, and shared providers (mail, encrypt-decrypt, upload). Ships with an MCP server so AI agents can always consult the latest guidance.

---

## 🏗️ What is it

This repository is **not a framework**. It is a **bootstrap** — a NestJS project skeleton containing:

- Base classes (`Result`, `AbstractRepository`, `AbstractService`, `AbstractPresenter`, `AbstractEventListener`, `ILogger`, `AsyncContext`).
- Shared infrastructure (middlewares, pipes, decorators, exceptions).
- 3 ready-to-use providers (AWS SES + EJS, Node `crypto`, AWS S3).
- 1 example module (`orders`) demonstrating **all** patterns end-to-end.
- `.hbs` templates for fast scaffolding of new modules.
- Full documentation in `docs/`.
- MCP server in `mcp-server/` exposing everything as tools for AI agents.

The intent is for new projects to **clone this repository** or **consume it via MCP** instead of manually copying code from older projects.

---

## 🚀 How to use

### Option A — clone as a starting point

```bash
git clone https://github.com/<owner>/nest-clean-blueprint.git my-new-api
cd my-new-api
rm -rf .git && git init
pnpm install
cp .env.example .env   # fill in your credentials
pnpm start:dev
```

Then:

1. Rename/remove the example module `src/modules/_example_orders/`.
2. Create your own modules following `docs/conventions/module-structure.md`.
3. Use the templates in `templates/` for scaffolding (manually or via plop/hygen).

### Option B — consume via MCP (recommended for AI-powered teams)

Keep this repository as the **single source of truth**. Each new project simply registers the MCP server in the editor (Copilot / Claude / Cursor) and queries the guidelines in real time.

See the [🔌 MCP Integration](#-mcp-integration) section below.

---

## 🤖 Squad as the Main AI Agent Orchestrator

This blueprint is designed for teams that use **multiple AI agents** working in parallel. We recommend [**Squad**](https://github.com/bradygaster/squad-cli) as the default orchestrator.

### Why Squad

- Coordinates agents in parallel (background) with a work queue.
- Per-agent "memory" pattern (`charter.md` + `history.md`).
- Centralized architectural decisions (`decisions.md`).
- Reusable skills in `.copilot/skills/` and `.squad/skills/`.
- Native integration with GitHub Issues + PRs.

### Recommended setup

In any project that uses this blueprint:

```bash
npx @bradygaster/squad-cli init
```

When Squad asks for team composition, we suggest the following roles:

| Role | Responsibility |
|---|---|
| 🏗️ **Lead** | Issue triage, architectural design, code review, blueprint compliance |
| 🔧 **Backend Dev** | Implement services, controllers, repositories following Result + ZodValidationPipe + Presenter |
| 🧪 **Tester** | Write unit + E2E tests, validate errors via `instanceOf`, maintain coverage |
| 📋 **Scribe** | (always present) Memory, decisions, session logs |

### Recommended skill

Add a `nest-clean-blueprint` skill in `.copilot/skills/` pointing to this MCP server. That way **every agent** consults the patterns automatically:

```markdown
---
name: nest-clean-blueprint
description: REQUIRED for any NestJS backend code. ALWAYS load before creating a service, writing a controller, adding a repository, building a module. Consult MCP `nest-clean-blueprint` for the latest patterns.
---

Before implementing any code:
1. `get_blueprint` — read the full blueprint.
2. `get_pattern <name>` — consult the relevant pattern.
3. `get_template <layer>` — use the template when creating files.
4. `get_checklist` before opening a PR.
```

---

## 🔌 MCP Integration

The MCP server in `mcp-server/` exposes this repository's documents and templates as **tools** consumable by any compatible client (GitHub Copilot, Claude Desktop/Code, Cursor, Continue, etc).

### Build

```bash
cd mcp-server
pnpm install
pnpm build
```

### Mode A — Local (reads from this clone)

Point the MCP at the local `dist/index.js`. Ideal for development — changes to docs are reflected immediately after a build.

```json
{
  "mcpServers": {
    "nest-clean-blueprint": {
      "type": "stdio",
      "command": "node",
      "args": ["/abs/path/to/nest-clean-blueprint/mcp-server/dist/index.js"]
    }
  }
}
```

### Mode B — Remote (reads directly from GitHub)

Set the `GITHUB_REPO` env var. The server fetches every file from `raw.githubusercontent.com` at request time — no local clone needed.

```json
{
  "mcpServers": {
    "nest-clean-blueprint": {
      "type": "stdio",
      "command": "node",
      "args": ["/abs/path/to/nest-clean-blueprint/mcp-server/dist/index.js"],
      "env": {
        "GITHUB_REPO":   "your-username/nest-clean-blueprint",
        "GITHUB_BRANCH": "main",
        "GITHUB_TOKEN":  "ghp_..."
      }
    }
  }
}
```

### Mode C — Hybrid (recommended for consumer projects)

Set both `GITHUB_REPO` **and** `LOCAL_CACHE_DIR`. On startup the server checks `docs/VERSION` from GitHub; if it is newer than the locally-cached version it downloads all docs into `LOCAL_CACHE_DIR` automatically. Normal tool calls are served from the fast local cache. When a specific doc is requested explicitly (e.g. `get_flow`), the response includes both the cached version and a fresh live copy from GitHub — so you always get the most comprehensive content.

```json
{
  "mcpServers": {
    "nest-clean-blueprint": {
      "type": "stdio",
      "command": "node",
      "args": ["/abs/path/to/nest-clean-blueprint/mcp-server/dist/index.js"],
      "env": {
        "GITHUB_REPO":     "your-username/nest-clean-blueprint",
        "GITHUB_BRANCH":   "main",
        "GITHUB_TOKEN":    "ghp_...",
        "LOCAL_CACHE_DIR": "/abs/path/to/consumer-project/.blueprint-cache"
      }
    }
  }
}
```

**How it works:**

1. **Startup**: fetches `docs/VERSION` from GitHub, compares with `LOCAL_CACHE_DIR/docs/VERSION`.
2. **If remote is newer**: downloads every doc/template into `LOCAL_CACHE_DIR` (all in parallel), then writes the new `VERSION` stamp last (so a partial sync never looks complete).
3. **Normal calls** (`list_*`, `get_*` serving cached data): served from `LOCAL_CACHE_DIR` — fast, offline-capable.
4. **Explicit doc requests** (`get_flow`, `get_pattern`, `get_convention`, `get_blueprint`, etc.): returns the local cache **and** a fresh GitHub copy side-by-side when they differ.

| Env var | Required | Description |
|---|---|---|
| `GITHUB_REPO` | ✅ | Repository slug — `owner/repo` |
| `GITHUB_BRANCH` | no (default: `main`) | Branch, tag, or commit SHA to read from |
| `GITHUB_TOKEN` | recommended | Personal Access Token. Without it GitHub limits unauthenticated requests to 60/h |
| `LOCAL_CACHE_DIR` | (enables HYBRID) | Absolute path where docs are cached locally |

> **Private repos** require `GITHUB_TOKEN` with `repo` scope.
> **Public repos** work without a token, but adding one avoids rate limits.

> ⚠️ `validate_module_structure` is only available in LOCAL mode (it needs filesystem access to the module you're validating).

### Available tools

| Tool | What it returns |
|---|---|
| `get_blueprint` | Full `docs/ARCHITECTURE-BLUEPRINT.md` |
| `list_patterns` / `get_pattern <name>` | Patterns: result-pattern, dependency-injection, pagination, async-context, event-driven |
| `list_conventions` / `get_convention <name>` | naming, module-structure, testing |
| `list_providers` / `get_provider_docs <name>` | mail-provider, encrypt-decrypt-provider, upload-provider |
| `list_templates` / `get_template <layer>` | Scaffolding `.hbs`: service, controller, repository, presenter, entity, dto, exception, module |
| `list_flows` / `get_flow <name>` | Infrastructure flows: auth-jwt, authorization-casl, bullmq-queues, cache-redis, logger, rate-limit, cronjobs, health-check |
| `get_email_template_example` | Welcome EJS + partials (header/footer) |
| `get_checklist` | Mandatory PR checklist |
| `validate_module_structure <path>` | Checks whether a module follows the required layout (LOCAL mode only) |

### ➕ Adding new MCP tools

The MCP server is designed so adding a new tool is always the same 3-step recipe:

#### Step 1 — Create the doc / file

Drop a Markdown file in the appropriate `docs/` subdirectory:

| Category | Directory | Tool pair |
|---|---|---|
| Patterns | `docs/patterns/my-pattern.md` | `get_pattern` / `list_patterns` |
| Conventions | `docs/conventions/my-convention.md` | `get_convention` / `list_conventions` |
| Providers | `docs/providers/my-provider.md` | `get_provider_docs` / `list_providers` |
| Flows | `docs/flows/my-flow.md` | `get_flow` / `list_flows` |

**No code changes needed** — `listContent` and `readContent` discover files automatically. Just create the file, rebuild, and the new name appears in `list_*` output.

#### Step 2 — Add a completely new tool category

Only needed when creating a new _type_ of tool (not just a new doc inside an existing category). Edit `mcp-server/src/index.ts`:

**2a. Add the relative path constant** (top of the file, alongside `R_FLOWS`, `R_PATTERNS`, etc.):

```typescript
const R_MY_CATEGORY = "docs/my-category";
```

**2b. Register the tool definitions** (inside `ListToolsRequestSchema` handler):

```typescript
{
  name: "list_my_category",
  description: "Lists all available my-category doc names.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
},
{
  name: "get_my_category",
  description: "Returns a specific my-category doc.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name without extension. Call list_my_category first." },
    },
    required: ["name"],
    additionalProperties: false,
  },
},
```

**2c. Add the switch cases** (inside `CallToolRequestSchema` handler):

```typescript
case "list_my_category": {
  const names = await listContent(R_MY_CATEGORY);
  return { content: [{ type: "text", text: names.join("\n") }] };
}

case "get_my_category": {
  const n = String((args as any)?.name ?? "");
  return {
    content: [{ type: "text", text: await readContent(safePath(R_MY_CATEGORY, n, ".md")) }],
  };
}
```

#### Step 3 — Build

```bash
cd mcp-server && pnpm build
```

Reload the MCP client (VS Code: `Cmd+Shift+P` → "Reload Window") — the new tools are immediately available.

### Version pinning

In production, check out a specific **tag** (e.g. `v1.0.0`) and point the MCP at that path. In remote mode, set `GITHUB_BRANCH` to the tag (`"v1.0.0"`). Guideline updates only land after the team consciously bumps the tag.

---

## 📐 Documented patterns

Full documentation in [`docs/`](./docs/):

- [📘 ARCHITECTURE-BLUEPRINT.md](./docs/ARCHITECTURE-BLUEPRINT.md) — overview
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
- [✅ Mandatory PR checklist](./docs/checklist-pr.md)

---

## 🧱 Available base classes

In [`src/@shared/`](./src/@shared/):

| Class / Token | File | Purpose |
|---|---|---|
| `Result<T>` | `classes/result.ts` | Success/error container returned by every service |
| `AbstractRepository<E, M>` | `classes/repository.ts` | CRUD + pagination over TypeORM |
| `AbstractService<Dto, R>` | `classes/service.ts` | `execute(dto, context?)` contract |
| `AbstractPresenter<M, R>` | `classes/presenter.ts` | `present` / `presentMany` / `presentWithoutRelations` |
| `AbstractEventListener<Dto>` | `classes/event-listener.ts` | `handle(event)` contract for `@OnEvent` |
| `ILogger` / `CustomLogger` | `classes/custom-logger.ts` | Structured logging with correlation ID |
| `AsyncContext` | `classes/async-context.ts` | AsyncLocalStorage for requestId/userId/timezone |
| `AbstractApplicationException` | `errors/abstract-application-exception.ts` | Base for every custom exception |
| `ZodValidationPipe` | `pipes/zod-validation.pipe.ts` | Inline validation pipe for `@Body/@Query/@Param` |
| `RequestIdMiddleware` | `middlewares/request-id.middleware.ts` | Seeds correlation ID per request |
| `@ReqContext()` | `@decorators/request-context.decorator.ts` | Builds `IRequestContext` in the controller |
| `@User()` | `@decorators/current-user.decorator.ts` | Extracts the authenticated user |

---

## 📦 Shared providers

In [`src/@shared/providers/`](./src/@shared/providers/):

- **mail-provider** — AWS SES with EJS rendering and partial support (`<%- include('partials/header') %>`).
- **encrypt-decrypt-provider** — Configurable Node `crypto` (algorithm + key + IV via env).
- **upload-provider** — AWS S3 with pre-signed URLs; `storageId` (`<bucket>/<key>`) round-trip.

Each provider exposes an abstract token (`TMailProvider`, `TEncryptDecryptProvider`, `TUploadProvider`) — just add `imports: [<X>ProviderModule]` and inject.

---

## 🛠️ Scaffolding templates

In [`templates/`](./templates/) (Handlebars `.hbs`):

| Template | Creates |
|---|---|
| `service.ts.hbs` | Service with `T...Service` + `execute` returning `Result<T>` |
| `controller.ts.hbs` | Controller with full path + inline `ZodValidationPipe` + presenter |
| `repository.ts.hbs` | Repository extending `AbstractRepository` |
| `presenter.ts.hbs` | Presenter with `present` / `presentMany` |
| `entity.ts.hbs` | TypeORM entity with snake_case columns + soft delete |
| `dto.ts.hbs` | Zod schema + type alias |
| `exception.ts.hbs` | Exception extending `AbstractApplicationException` |
| `module.ts.hbs` | Module with `useClass` for all tokens |

Placeholders: `{{Name}}`, `{{name}}`, `{{Entity}}`, `{{entity}}`, `{{EntitiesPlural}}`, `{{entitiesPlural}}`, `{{entities-plural}}`, `{{Action}}`, `{{action}}`.

---

## ✅ Mandatory PR checklist

See [`docs/checklist-pr.md`](./docs/checklist-pr.md). Reviewers must reject PRs that fail any item.

Summary:

- Services return `Result<T>`, **never** throw exceptions
- Only controllers throw (and attach `context` first)
- All input validated with inline `ZodValidationPipe`
- Full path in `@Controller`, empty HTTP decorators
- List services return `IPagination<T>` and inject `TEnvService`
- Migrations created manually (`migration:create`, **never** `:generate`)
- Errors tested via `toBeInstanceOf`, never by message
- `pnpm check && pnpm lint && pnpm test:unit` pass

---

## 🏷️ Versioning

This repository follows **SemVer**. Each release gets a git tag (`v1.0.0`, `v1.1.0`, ...).

When consuming via MCP in critical projects:

1. Check out a specific tag.
2. Point the MCP at that path.
3. Only update after reviewing `CHANGELOG.md`.

---

## 🤝 Contributing

1. Open an issue describing the proposed change to a pattern / convention / provider.
2. Breaking changes to existing patterns require **prior discussion** + an entry in `CHANGELOG.md` under `BREAKING CHANGES`.
3. Every new guideline must be reflected in **three places**:
   - Document in `docs/`
   - Example in the `_example_orders/` module (when applicable)
   - Tool in the MCP server (when it is a new category)
4. Run the PR checklist before marking as ready for review.

---

## 📄 License

MIT — see [LICENSE](./LICENSE).

