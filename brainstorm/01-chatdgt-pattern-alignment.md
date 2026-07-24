# Brainstorm: Align nest-clean-blueprint with chat-dgt backend patterns

**Date:** 2026-07-24
**Status:** active

## Problem Framing

`nest-clean-blueprint` is a bootstrap / code-style guide project, consumed by AI agents
through its MCP server (docs, patterns, conventions, providers, flows, scaffolding
templates, skills). The real-world backend `chat-dgt/apps/backend` has since evolved a
more refined set of NestJS patterns and conventions. The blueprint has drifted and no
longer reflects the current source-of-truth style.

Goal: bring the blueprint's code, conventions, skills, docs, templates, and MCP into line
with chat-dgt's **universal** patterns — while keeping the blueprint product-agnostic
(no chat-specific multi-tenancy or LLM/OpenAI coupling). Additionally, port two chat-dgt
`.claude` skills (`backend-patterns-nestjs`, `backend-reviewer`) into the blueprint and
update the MCP to serve them.

Two independent deep-diffs were run (shared-layer/code-style; module-level patterns). Both
found the blueprint's `backoffice` module already tracks chat-dgt closely, while
`_example_orders` (the canonical scaffold) diverges most.

## Approaches Considered

### A: Patterns-only alignment + curated infra additions (CHOSEN)
- Adopt chat-dgt's **universal** conventions and the `RequestContext` (AsyncLocalStorage)
  pattern that removes manual `error.context` threading.
- Cherry-pick a few infra pieces the user wants generically: **argon2** (replacing bcrypt),
  **GCS** as an additional upload provider (alongside existing S3), and **Sentry**.
- Skip product-specific infra: multi-tenancy / `TenantContext` / tenant-aware `BaseEntity`
  tenant seeding, and OpenAI/LLM provider.
- Pros: blueprint stays generic and reusable; picks up the important structural pattern
  (RequestContext) that unblocks controller/service/exception cleanups; adds broadly useful
  providers/observability.
- Cons: `BaseEntity` is introduced without `tenantId`, so it diverges slightly from
  chat-dgt's tenant-aware base (acceptable — documented).

### B: Patterns + multi-tenancy
- Also adopt `TenantContext`, tenant-aware `BaseEntity`, tenant-context interceptor.
- Pros: closer parity with chat-dgt.
- Cons: makes the bootstrap opinionated/multi-tenant by default; wrong default for a generic
  blueprint. **Rejected.**

### C: Full parity (argon2 + GCS + Sentry + OpenAI + multi-tenancy)
- Mirror chat-dgt wholesale.
- Cons: turns the generic blueprint into a chat-dgt clone. **Rejected.**

## Decision

**Approach A**, with the user's explicit refinements:

1. **Alignment scope:** patterns-only + `RequestContext`. Additions on top: swap
   bcrypt → **argon2**; add **GCS** as an extra provider inside `upload-provider` (keep S3);
   add **Sentry** observability. Do **not** add multi-tenancy or OpenAI.
2. **Conventions:** apply all four delta groups — Naming+lint, File layout, Method
   signatures, Dependency bumps — and additionally **port chat-dgt's `eslint.config` +
   `eslint-local-rules`** (adapted to single-package).
3. **Skills:** port both `backend-patterns-nestjs` and `backend-reviewer`, path-adapted to
   this single-package repo (no monorepo `apps/backend` / `backend/` prefixes, no Stop-hook
   monorepo assumptions), including `backend-reviewer`'s ts-morph validator toolchain
   (adapted). Install into **both** `.claude/skills/` (project auto-invoke) **and** top-level
   `skills/` (so the MCP can serve them).
4. **Docs + MCP:** full sync — update `templates/*.hbs` and `docs/patterns` to the new
   conventions, and update `mcp-server/src/index.ts` (tool list, `validate_module_structure`,
   skill wiring, version bump).

## Key Requirements

Derived from the two diff analyses. Grouped by workstream; feeds the formal spec.

### R1 — Shared layer (`src/@shared/`)
- Rename `@shared/schames/` → `@shared/schemas/`; add `uuid-param.schema.ts`.
- Introduce `@shared/context/request.context.ts` (`RequestContext`, AsyncLocalStorage,
  `IRequestContextModel`) replacing `classes/async-context.ts` + `protocols/request-context.struct.ts`.
- Add `@shared/entities/base.entity.ts` (`id/createdAt/updatedAt/deletedAt`) **without**
  `tenantId` (generic). Entities extend it instead of re-declaring columns.
- Add `@shared/observability/sentry.ts`; wire `captureException` into `exceptions.filter.ts`.
- Move decorators from top-level `src/@decorators` into `@shared/decorators/`
  (`current-user`, `public`, request-context).
- Cryptography: replace `bcrypt-hasher.service.ts` with `argon2-hasher.service.ts`.
- Upload provider: keep `aws-s3.provider.ts`, add `gcs.provider.ts` as an additional provider.
- Repository base (`@shared/classes/repository.ts`): rename `IPagination`→`IPaginationModel`,
  `IRepository`→`IRepositoryModel` (+ other `I…` → `I…Model`); switch method signatures to
  object-params (`create({data,id})`, `findById({id})`, `update({id,data,relations})`,
  `batchUpsert({dataArray,...})`). Keep base find methods returning `Model | undefined`.
- Presenter base (`@shared/classes/presenter.ts`): `present({entity, options})` object-param;
  give `presentWithoutRelations`/`presentMany` default bodies; add `presentSuccess()`.
- Service base (`@shared/classes/service.ts`): `execute(payload)` single-arg (drop `context`).
- Exception base (`abstract-application-exception.ts`): read `RequestContext.getContext()`
  in constructor; drop the `context?` param.
- Filter `shouldIgnore(...)` → object-param.

### R2 — Example module (`_example_orders`) as the canonical scaffold
- Controllers: drop `@ReqContext()` param and manual `result.error.context = context`; call
  `service.execute(dto)` single-arg; add `@HttpCode(HttpStatus.OK)` on non-201 verbs.
- Services: remove `context?` from `execute`; add in-service `validateDto()` Zod re-parse.
- Repositories: adopt object-param signatures; custom raw-TypeORM methods typed `| null`,
  mapped-model methods `| undefined`.
- Presenters: object-param `present`, drop `@Injectable()` (wire via `useClass`).
- Entities: extend shared `BaseEntity`.
- Errors: split `errors/order.errors.ts` into one-class-per-file `*.exception.ts`; remove
  `context` args from constructors + call sites.
- Models: rename `models/order.model.ts` → `order.struct.ts` (`IOrderModel` kept).
- DTOs: split `dto/order.dto.ts` into per-action files (`create-order.dto.ts`, …).
- `backoffice` module already conforms — use as reference, minor touch-ups only.

### R3 — Config & tooling
- `.prettierrc`: add `printWidth: 100`, `arrowParens: "always"`, `endOfLine: "lf"`; add `.prettierignore`.
- ESLint: port chat-dgt `eslint.config` + `eslint-local-rules` (adapted, single-package):
  interface `prefix I` + `suffix Model`; typeAlias `prefix T`; **enum `suffix Enum`**;
  `@typescript-eslint/no-unused-vars: error`; custom `require-presenter-usage` rule on
  `*.controller.ts`; spec-file `unbound-method` override.
- `tsconfig`: evaluate `nodenext` module/resolution + `isolatedModules` + `strictPropertyInitialization:false` (spec to confirm scope).
- `tsconfig.build.json`: exclude `**/*e2e-spec.ts`.
- Jest: add `coverageThreshold` 80%.
- Comments: convert Portuguese source comments to English.
- Dep bumps: **zod v3 → v4**, **jest 29 → 30** (code migration required). Add `argon2`,
  `@sentry/node`, `@google-cloud/storage`.

### R4 — Skills
- Port `backend-patterns-nestjs` (291 lines) — adapt scope banner from `apps/backend/` to this repo.
- Port `backend-reviewer` (177-line SKILL.md + `scripts/`: `pattern-validator.ts`, `types.ts`,
  `rules/{ast-rules,regex-rules,test-rules}.ts`) — adapt paths (drop `apps/backend`/`backend`
  prefixes, `git diff` globs, Stop-hook/`./tmp` skip-flag assumptions) to single-package layout.
  Exclude `node_modules` (reinstall via the scripts' own `package.json`).
- Install into both `.claude/skills/<name>/` and `skills/<name>/SKILL.md`. Reconcile with the
  existing `skills/backend-patterns` (keep option 1: both skills present; decide dedupe of the
  older `backend-patterns` during specify).

### R5 — Docs, templates, MCP
- Update `templates/*.hbs` (service, controller, repository, presenter, entity, dtos,
  exception, module) to new conventions (object-params, RequestContext, per-action DTO shape,
  presenter object-param + no `@Injectable`, BaseEntity extension).
- Update `docs/patterns/*` and relevant `docs/conventions/*` accordingly; bump `docs/VERSION`.
- Update `mcp-server/src/index.ts`: reflect new/renamed skills in skill listing; confirm
  `validate_module_structure` required-folder set still matches (`controllers/dto/entities/
  errors/models/presenters/repositories/services`); bump server `version` (0.3.0 → next).

## Open Questions
- tsconfig `nodenext` migration: adopt fully or keep `commonjs`? (chat-dgt's `nodenext` is
  partly monorepo-driven — spec should decide whether the blueprint needs it.)
- typeorm: chat-dgt shows `^1.0.0` (likely internal/aliased); blueprint stays on standard
  `^0.3.20` — confirm no pattern depends on the newer line.
- Existing `skills/backend-patterns` vs new `backend-patterns-nestjs`: keep both, or retire
  the old one to avoid duplication in MCP `list_skills`.
- `backend-reviewer` skip-flag / Stop-hook: this blueprint has no equivalent Stop hook —
  decide whether the ported skill keeps a (repo-local) skip mechanism or drops it.
