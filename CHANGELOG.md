# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - chat-dgt pattern alignment - 2026-07-24

Pre-1.0 breaking alignment of the blueprint's shared layer, example module, tooling and
distribution surface (skills/templates/docs/MCP) with the current `chat-dgt/apps/backend`
conventions. No backwards-compatibility shims — this is a one-way migration.

### Breaking Changes

- **`AsyncContext` → `RequestContext`**: `src/@shared/classes/async-context.ts` and
  `src/@shared/protocols/request-context.struct.ts` removed. Replaced by
  `src/@shared/context/request.context.ts` (`RequestContext`, `IRequestContextModel`,
  AsyncLocalStorage-based). No tenant field/logic. `@ReqContext()` decorator and manual
  `error.context = context` attachment in controllers removed — context is read internally by
  `AbstractApplicationException` and the exceptions filter.
- **`src/@shared/schames/` → `src/@shared/schemas/`**: directory renamed; all imports updated;
  added `uuid-param.schema.ts`.
- **`src/@decorators/*` → `src/@shared/decorators/*`**: `current-user`, `public`,
  `request-context` decorators moved; old `src/@decorators/` removed.
- **`bcryptjs` → `argon2`**: `bcrypt-hasher.service.ts` replaced by `argon2-hasher.service.ts`
  (argon2id). `bcryptjs`/`@types/bcryptjs` removed from `package.json`.
- **Base class signatures — positional params → object params**:
  - `AbstractRepository`: `create({data,id?})`, `findById({id})`, `update({id,data,relations?})`,
    `batchUpsert({...})`; base mapped finders now return `Model | undefined`.
  - `AbstractPresenter`: `present({entity,options?})`; `presentMany`/`presentWithoutRelations` get
    default implementations; new `presentSuccess()` helper. Concrete presenters are plain classes
    (no `@Injectable()`), wired via `useClass`.
  - `AbstractService`: `execute(payload)` is now single-arg (no `context` param); added the
    `validateDto()` convention.
  - `AbstractApplicationException`: constructor is now `(message, name, statusCode)` — no
    `context` param; reads `RequestContext.getContext()` internally.
- **`I...` → `I...Model` interface renames** repo-wide (lint-enforced via
  `@typescript-eslint/naming-convention`): `IPagination→IPaginationModel`,
  `IRepository→IRepositoryModel`, `IBulkOperationOptions→...Model`,
  `IPostgreSQLError→...Model`, `IQueryPerformanceMetrics→...Model`,
  `IRedisConnectionOptions→...Model`, `ICacheOptions→...Model`, `IPolicyHandler→...Model`, and
  others across `@shared` providers/helpers and `modules/*`. Type aliases now require a `T`
  prefix; enums require an `Enum` suffix.
- **Model files renamed `.model.ts` → `.struct.ts`** (e.g. `order.model.ts` → `order.struct.ts`),
  interface name kept (`IOrderModel`).
- **Per-action DTOs**: `_example_orders`' single `dto/order.dto.ts` split into
  `create-order.dto.ts`, `get-order.dto.ts`, `list-orders.dto.ts`, `update-order.dto.ts`,
  `delete-order.dto.ts` — each with its own Zod schema + `T...Dto` type.
- **One-exception-per-file**: `errors/order.errors.ts` split into
  `order-not-found.exception.ts` and `order-already-cancelled.exception.ts`.
- **`skills/backend-patterns/` removed** — retired in favor of the ported
  `skills/backend-patterns-nestjs/` (same coverage, single source of truth; also served via
  `.claude/skills/`).
- **Zod v3 → v4**, **Jest 29 → v30 / ts-jest → 29.4.x line**: schemas, `ZodError.errors` →
  `.issues`, and the test toolchain bumped; `jest.config.js` now enforces an 80% global coverage
  threshold (branches/functions/lines/statements).
- **ESLint config replaced**: ported single-package config (no monorepo/React globs) enforcing
  `I...Model`/`T...`/`...Enum` naming, `no-unused-vars` as error, a spec-file
  `unbound-method` override, and a new `local/require-presenter-usage` rule
  (`eslint-local-rules/`) requiring controllers to return via a presenter method.
- **Prettier**: `printWidth: 100`, `arrowParens: "always"`, `endOfLine: "lf"`.

### Added

- `src/@shared/observability/sentry.ts` — `initSentry()`/`captureException()`, no-op unless
  `SENTRY_DSN` is set; wired into `main.ts` bootstrap and the exceptions filter.
- `src/@shared/providers/upload-provider/providers/gcs.provider.ts` — GCS upload provider
  alongside S3 (env-switched via `UPLOAD_PROVIDER`; S3 remains the default).
- `@sentry/node`, `@google-cloud/storage`, `argon2` dependencies; optional `SENTRY_DSN` and GCS
  env keys in the env schema and `.env.example`.
- `src/@shared/entities/base.entity.ts` (`BaseEntity`: id/createdAt/updatedAt/deletedAt, no
  tenant) — all entities now extend it instead of re-declaring these columns.
- `src/@shared/middlewares/request-context.middleware.ts` — consolidates request-id generation
  and `RequestContext` seeding.
- Ported skills `backend-patterns-nestjs` and `backend-reviewer` (with its ts-morph-based
  AST/regex/test validator toolchain, adapted to this repo's single-package layout and
  conventions) under both `skills/` (MCP-served) and `.claude/skills/` (agent auto-invoke).
- 663+ new unit tests across `@shared` and `modules/**` to satisfy the new 80% coverage gate.

### Changed

- Portuguese source-code comments converted to English repo-wide.
- `docs/patterns/`, `docs/conventions/`, `docs/providers/upload-provider.md`,
  `docs/ARCHITECTURE-BLUEPRINT.md`, `docs/checklist-pr.md`, all 8 `templates/*.hbs`, and the MCP
  server (`mcp-server/`, version `0.3.0` → `0.4.0`) updated to describe/generate/serve the above
  conventions. `docs/VERSION` bumped `1.1.0` → `1.2.0`.

---

## [mcp-server@0.3.0] - 2026-05-29

### Added

- **`setup_speckit` MCP tool** — executes `specify init --here --integration copilot --script sh` followed by `specify extension add squad --from <zip>` in `REPO_ROOT`. LOCAL mode only; aborts on first command failure. Requires `specify` CLI in PATH.

---

## [0.1.0] - 2026-05-09

### Added

- **Core shared classes**: `Result<T>`, `AbstractRepository<Entity, Model>` (with pagination, soft-delete, queryBuilder), `AbstractService`, `AbstractPresenter`, `AbstractEventListener`, `AsyncContext` (AsyncLocalStorage), `CustomLogger` (wraps NestJS `ConsoleLogger`, injects `requestId` on every line)
- **Shared error base**: `AbstractApplicationException` with `statusCode`, `errorCode` and `context`
- **Shared pipes**: `ZodValidationPipe` for inline `@Body/@Query/@Param` validation
- **Shared middleware**: `RequestIdMiddleware` — seeds `requestId` and `timezone` into `AsyncContext` from `x-request-id` / `x-user-timezone` headers
- **Decorators**: `@ReqContext()` and `@User()` for controller injection
- **`mail-provider`** — AWS SES v3 + EJS template rendering with partial support (`welcome.ejs`, `header.ejs`, `footer.ejs`)
- **`encrypt-decrypt-provider`** — Node.js `crypto` (createCipheriv/createDecipheriv), algorithm/key/IV via env
- **`upload-provider`** — AWS S3 v3: `PutObject`, `GetObject` (presigned URL + buffer), `HeadObject`, `DeleteObject`
- **`EnvModule`** — global `ConfigModule` with Zod schema validation; `TEnvService` DI token
- **Example module `_example_orders`** — full CRUD demonstrating all patterns: entity, model, DTO (Zod), errors, repository, presenter, 5 services (each returning `Result<T>`), 5 controllers, module wiring
- **`app.module.ts`** — wires TypeORM (postgres, async), EventEmitter, providers and `RequestIdMiddleware`
- **`main.ts`** — `process.env.TZ = 'UTC'`, Helmet, CORS, `/api` prefix, URI versioning `v1`
- **8 Handlebars scaffolding templates** — `service`, `controller`, `repository`, `presenter`, `entity`, `dto`, `exception`, `module`
- **Docs** — `ARCHITECTURE-BLUEPRINT.md`, `checklist-pr.md`, 5 pattern docs, 3 convention docs, 3 provider docs
- **MCP server** (`mcp-server/`) — 11 tools exposing blueprint, patterns, conventions, provider docs, templates and checklist to AI agents via stdio
- **`.env.example`** — all required environment variables with safe placeholder values
- **`pnpm-workspace.yaml`** — monorepo workspace including `mcp-server`
- **CI workflow** (`.github/workflows/ci.yml`) — install, type-check, lint and test on push/PR
