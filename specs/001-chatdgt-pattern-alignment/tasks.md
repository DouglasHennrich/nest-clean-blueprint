---
description: "Task list for aligning nest-clean-blueprint with chat-dgt backend patterns"
---

# Tasks: Align blueprint with chat-dgt backend patterns

**Input**: Design documents from `/specs/001-chatdgt-pattern-alignment/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: Existing unit/e2e specs are migrated and kept green (jest 30, coverage ≥80%). No new
TDD suite requested; migration-correctness is validated via `pnpm test`.

**Reference source** (read-only, for porting): `/Users/douglashennrich/Documents/Projetos/DGT/chat-dgt/apps/backend` and its `.claude/skills/{backend-patterns-nestjs,backend-reviewer}`.

**Story map**: US1 = code+conventions (R1 shared layer + R2 example module + R3 config/tooling) ·
US2 = skills (R4) · US3 = MCP serves updated blueprint (R5 docs/templates/MCP).

## Format: `[ID] [P?] [Story] Description`
- **[P]** = parallelizable (different files, no incomplete deps)

---

## Phase 1: Setup (dependencies & branch)

- [ ] T001 Create/checkout feature branch `001-chatdgt-pattern-alignment` (repo currently on `main`; no git extension auto-branched).
- [ ] T002 In `package.json`, add `argon2`, `@sentry/node`, `@google-cloud/storage`; remove `bcryptjs`; bump `zod`→`^4`, `jest`/`@types/jest`/`ts-jest`→v30 line; run `pnpm install` and record lockfile.
- [ ] T003 [P] Verify `argon2` native build in `Dockerfile` (add build deps if needed).

---

## Phase 2: Foundational — Shared layer (R1) — BLOCKS US1/US2/US3

**Purpose**: the shared-layer refactor every module and template depends on. RequestContext (D7) is the enabler.

- [ ] T004 Add `src/@shared/context/request.context.ts`: `RequestContext` (AsyncLocalStorage) + `IRequestContextModel` (requestId, userId?, startedAt, method/path; NO tenant field). Port shape from chat-dgt `@shared/context/request.context.ts`, stripping tenant logic.
- [ ] T005 Add request-context middleware in `src/@shared/middlewares/request-context.middleware.ts` that seeds `RequestContext` per request (consolidating existing `request-id` + `create-request-log-entity` middlewares); wire in the HTTP bootstrap.
- [ ] T006 Remove `src/@shared/classes/async-context.ts` and `src/@shared/protocols/request-context.struct.ts`; update all imports to `RequestContext`.
- [ ] T007 Add `src/@shared/entities/base.entity.ts` (`id` uuid PK, `createdAt`, `updatedAt`, `deletedAt`; NO tenantId/BeforeInsert). Port from chat-dgt, stripping tenant seeding.
- [ ] T008 Rename `src/@shared/schames/` → `src/@shared/schemas/`; add `uuid-param.schema.ts`; update all imports (`@/@shared/schemas/...`).
- [ ] T009 Move `src/@decorators/*` → `src/@shared/decorators/` (current-user, public, request-context); delete `src/@decorators/`; update imports and any tsconfig path refs.
- [ ] T010 Replace `src/@shared/modules/cryptography/bcrypt-hasher.service.ts` with `argon2-hasher.service.ts` implementing the existing hasher port; update DI provider wiring (D9).
- [ ] T011 [P] Add `src/@shared/observability/sentry.ts` (init only when `SENTRY_DSN` set; `captureException` no-op otherwise) (D8).
- [ ] T012 [P] Add `src/@shared/providers/upload-provider/providers/gcs.provider.ts` alongside `aws-s3.provider.ts`; register in upload-provider module with S3 as default (D8).
- [ ] T013 [P] Extend env schema in `src/modules/env/` with optional `SENTRY_DSN` + GCS config keys; update `.env.example`.
- [ ] T014 Edit `src/@shared/classes/repository.ts`: rename `IPagination/IRepository/IBulkOperationOptions/IPostgreSQLError/IQueryPerformanceMetrics` → `…Model`; switch to object-param signatures (`create({data,id?})`, `findById({id})`, `update({id,data,relations?})`, `batchUpsert({…})`); base mapped finders return `Model | undefined`.
- [ ] T015 Edit `src/@shared/classes/presenter.ts`: `present({entity,options?})`; default bodies for `presentWithoutRelations`/`presentMany`; add `presentSuccess()`.
- [ ] T016 Edit `src/@shared/classes/service.ts`: `execute(payload)` single-arg (drop `context`); document `validateDto()` convention.
- [ ] T017 Edit `src/@shared/errors/abstract-application-exception.ts`: drop `context` param; read `RequestContext.getContext()` in constructor.
- [ ] T018 Edit `src/@shared/filters/exceptions.filter.ts`: use `RequestContext.getRequestId()`; `shouldIgnore({exception,req})` object-param; route unignored exceptions through `observability/sentry`.
- [ ] T019 [P] Convert Portuguese source-code comments → English repo-wide across `src/` (grep for non-ASCII/pt-BR comment markers; covers `@shared` interceptors/middlewares/filters AND module-level comments), per FR-019.

**Checkpoint**: `pnpm check` compiles the shared layer (modules may still break until Phase 3).

---

## Phase 3 (US1, P1): Example module + config/tooling — code matches conventions

**Goal**: `_example_orders` + `backoffice` conform; lint/format/build enforce it; suite green.
**Independent test**: `pnpm check && pnpm lint && pnpm test` clean; inspection per quickstart §2.

### Config/tooling (R3)
- [ ] T020 [P] [US1] Replace `eslint.config.mjs` with chat-dgt config adapted to single-package (drop React plugins, `apps/*` globs): interface `I…`+`Model` suffix, typeAlias `T…`, enum `…Enum`, `no-unused-vars` error, spec-file `unbound-method` override.
- [ ] T021 [US1] Add `eslint-local-rules/` with `require-presenter-usage` rule (port from chat-dgt `eslint-local-rules/index.mjs`) targeting `**/*.controller.ts`; wire into eslint config.
- [ ] T022 [P] [US1] Update `.prettierrc` (`printWidth:100`, `arrowParens:"always"`, `endOfLine:"lf"`); add `.prettierignore`; run `pnpm format`.
- [ ] T023 [P] [US1] Edit `tsconfig.build.json` to exclude `**/*e2e-spec.ts` (align with `.spec.e2e.ts` naming); edit `jest.config.js` to add `coverageThreshold` 80%.
- [ ] T024 [US1] Migrate Zod v3→v4 usages repo-wide (schemas, `z.infer`, `ZodValidationPipe`, `zod-validation-error` compat) (D3).
- [ ] T025 [US1] Migrate Jest 29→30 (config + any API changes) so the suite runs (D4).

### `_example_orders` alignment (R2)
- [ ] T026 [US1] Rename `models/order.model.ts` → `models/order.struct.ts` (keep `IOrderModel`); update imports.
- [ ] T027 [US1] Split `dto/order.dto.ts` into per-action files (`create-order.dto.ts`, `get-order.dto.ts`, `list-orders.dto.ts`, `update-order.dto.ts`, `delete-order.dto.ts`); each `xDtoSchema` + `TXDto` + `.extend()` service schema.
- [ ] T028 [US1] Split `errors/order.errors.ts` into one class per `*.exception.ts`; drop `context` args; `super(msg,name,status)`.
- [ ] T029 [US1] Entities in `entities/` extend `BaseEntity` (remove re-declared id/timestamps).
- [ ] T030 [US1] Repositories → object-param signatures; custom raw-TypeORM methods typed `| null`.
- [ ] T031 [US1] Presenters: object-param `present({entity})`, drop `@Injectable()`, wire via `useClass` in the module.
- [ ] T032 [US1] Services: drop `context` param from `execute`; add `validateDto()` Zod re-parse.
- [ ] T033 [US1] Controllers: drop `@ReqContext()` + manual `error.context` attach; single-arg `service.execute(dto)`; add `@HttpCode(HttpStatus.OK)` on non-201; return via presenter method.
- [ ] T034 [US1] Update `_example_orders` `*.module.ts` providers wiring for the above.

### `backoffice` reconciliation (R2)
- [ ] T035 [P] [US1] Apply minimal touch-ups to `src/modules/backoffice` for object-params, `BaseEntity`, exception-context, and naming so it matches the same conventions.

- [ ] T036 [US1] Run `pnpm check && pnpm lint && pnpm test`; fix until green (coverage ≥80%).

**Checkpoint**: US1 complete — build green, conventions enforced.

---

## Phase 4 (US2, P1): Skills (R4)

**Goal**: both skills present & runnable in single-package form.
**Independent test**: quickstart §3.

- [ ] T037 [US2] Port `backend-patterns-nestjs/SKILL.md` into `skills/backend-patterns-nestjs/` and `.claude/skills/backend-patterns-nestjs/`; adapt scope banner (`src/`, no `apps/backend`, no `apps/web` note); fold any unique content from the old skill.
- [ ] T038 [US2] Port `backend-reviewer` (SKILL.md + `scripts/{pattern-validator,types}.ts`, `scripts/rules/{ast,regex,test}-rules.ts`, `scripts/{package.json,tsconfig.json,.gitignore}`; NO node_modules) into `skills/backend-reviewer/` and `.claude/skills/backend-reviewer/`.
- [ ] T039 [US2] Adapt `backend-reviewer` SKILL.md flow (D6): `git diff` glob `^src/.*\.ts$`; `pnpm check`/`pnpm lint` at root; validator path `.claude/skills/backend-reviewer/scripts`; REMOVE Stop-hook `./tmp/.backend-reviewer-skip` steps.
- [ ] T040 [US2] Adapt validator `rules/*` to the blueprint conventions (I…Model, object-params, presenter-usage, per-action DTOs, one-error-per-file) and this repo's `@/*` tsconfig; verify it loads via ts-morph.
- [ ] T041 [US2] Remove `skills/backend-patterns/` (retired, D5).
- [ ] T042 [US2] Run `backend-reviewer` against `_example_orders`; confirm zero violations and clean exit when no files changed.

**Checkpoint**: US2 complete.

---

## Phase 5 (US3, P2): Docs, templates, MCP (R5)

**Goal**: MCP + distributed docs/templates reflect the aligned state.
**Independent test**: quickstart §5.

- [ ] T043 [P] [US3] Update all `templates/*.hbs` (service, controller, repository, presenter, entity, dtos, exception, module) to new conventions (object-params, RequestContext, per-action DTO shape, presenter object-param w/o `@Injectable`, `BaseEntity` extension).
- [ ] T044 [P] [US3] Update `docs/patterns/*` (result-pattern, dependency-injection, async-context→request-context, pagination, event-driven) and `docs/conventions/{naming,module-structure,testing}.md` to the new rules.
- [ ] T045 [P] [US3] Add provider doc for GCS + update `docs/providers/upload-provider.md`; note argon2 in encrypt/hash docs; add Sentry note.
- [ ] T046 [US3] Bump `docs/VERSION`.
- [ ] T047 [US3] Edit `mcp-server/src/index.ts`: ensure `list_skills`/`get_skill` surface the two ported skills (served from `skills/`); confirm `validate_module_structure` folder set; bump server `version` >0.3.0 (e.g. 0.4.0).
- [ ] T048 [US3] Update `docs/ARCHITECTURE-BLUEPRINT.md` + `docs/checklist-pr.md`: replace any `AsyncContext`/positional-param/`I…`(non-Model)/grouped-error references with the new conventions (RequestContext, object-params, `I…Model`, one-error-per-file).

**Checkpoint**: US3 complete.

---

## Phase 6: Polish & cross-cutting

- [ ] T049 [P] Record all breaking changes in `CHANGELOG.md` (schames→schemas, AsyncContext→RequestContext, @decorators move, bcrypt→argon2, object-params, I…Model renames, skill removal) (FR-027).
- [ ] T050 Scaffold a throwaway module from updated `templates/*.hbs`; run `backend-reviewer` → zero violations (SC-005); delete throwaway.
- [ ] T051 Boot app with no `SENTRY_DSN`/GCP creds → verify graceful degradation, S3 default works (D8, quickstart §6).
- [ ] T052 Final `pnpm check && pnpm lint && pnpm test` (coverage ≥80%); update `README.md` + `README.pt-BR.md` sections that describe module structure / patterns to the new conventions.

---

## Dependencies & order
- Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6.
- US1 depends on Phase 2 (shared layer). US2 depends on US1 (reviewer rules encode settled conventions). US3 depends on US1/US2 (templates/docs describe them; MCP serves the skills).
- Within Phase 2: T004→T005/T006; T014-T018 depend on T004 (RequestContext) + naming.

## Parallel opportunities
- Phase 2: T011, T012, T013, T019 [P] (independent files) alongside the class edits.
- Phase 3: T020, T022, T023, T035 [P].
- Phase 5: T043, T044, T045 [P].

## MVP scope
US1 alone (Phases 1–3) is a viable MVP: the blueprint's code + conventions match chat-dgt and the
build is green. US2 (skills) and US3 (MCP/docs) are incremental deliveries on top.

## Totals
52 tasks — US1: 17 · US2: 6 · US3: 6 · Setup/Foundational/Polish: 23.
