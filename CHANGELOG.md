# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
