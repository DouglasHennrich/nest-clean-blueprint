# Feature Specification: Align blueprint with chat-dgt backend patterns

**Feature Branch**: `001-chatdgt-pattern-alignment`

**Created**: 2026-07-24

**Status**: Draft

**Input**: Brainstorm `brainstorm/01-chatdgt-pattern-alignment.md` (commit 9b54fac). Align `nest-clean-blueprint` with the current NestJS patterns and code style of `chat-dgt/apps/backend`; port the `backend-patterns-nestjs` and `backend-reviewer` skills; update docs, templates, and the MCP server.

## User Scenarios & Testing *(mandatory)*

The "users" of this project are **developers and AI agents** who consume the blueprint —
directly (reading `docs/`, copying `templates/`, following `skills/`) and indirectly through
the MCP server that serves the blueprint as a single source of truth.

### User Story 1 - Scaffolded code matches current source-of-truth style (Priority: P1)

A developer (or AI agent) scaffolds a new module from the blueprint's templates and example
module. The generated code should already follow chat-dgt's current conventions — object-param
method signatures, `RequestContext` for request-scoped data, per-action DTO files,
one-error-per-file exceptions, presenter object-params, entities extending a shared base,
`I…Model` / `…Enum` naming — so no rework is needed to bring it up to standard.

**Why this priority**: The blueprint's entire reason for existing is to encode the current
house style. If the example module and templates are stale, every consumer inherits drift.

**Independent Test**: Scaffold/inspect the `_example_orders` module and the `templates/*.hbs`;
verify each conforms to the documented conventions and that `pnpm check` + `pnpm lint` pass
clean under the ported ESLint config.

**Acceptance Scenarios**:

1. **Given** the example module, **When** a reviewer checks a controller, **Then** it calls the
   service with a single argument, throws `result.error` directly (no manual context attach),
   and returns via a presenter method.
2. **Given** the shared layer, **When** a service returns an error, **Then** the exception
   self-populates its context from `RequestContext` with no `context` argument threaded.
3. **Given** the templates, **When** any `*.hbs` is rendered, **Then** the output matches the
   example module's conventions (object-params, per-action DTOs, presenter shape, `BaseEntity`).
4. **Given** the repo, **When** `pnpm lint` runs, **Then** interface `I…Model`, enum `…Enum`,
   and controller presenter-usage rules are enforced with zero violations in shipped code.

### User Story 2 - Pattern guidance and automated review available as skills (Priority: P1)

A developer or AI agent working in the blueprint (or a project bootstrapped from it) can invoke
the `backend-patterns-nestjs` skill for authoritative pattern guidance and the `backend-reviewer`
skill to deterministically validate changed files against the architecture rules.

**Why this priority**: Skills are the primary way agents self-correct to the house style; porting
them is an explicit goal.

**Independent Test**: Invoke each skill in this repo; `backend-reviewer` runs `check` + `lint` +
its validator against changed `.ts` files and reports violations without relying on any
monorepo path or external Stop-hook.

**Acceptance Scenarios**:

1. **Given** the ported skills, **When** an agent lists project skills, **Then**
   `backend-patterns-nestjs` and `backend-reviewer` appear in both `.claude/skills/` and the
   top-level `skills/` directory.
2. **Given** a changed backend file with a known violation, **When** `backend-reviewer` runs,
   **Then** it reports the violation and (per its flow) attempts correction, using single-package
   paths (no `apps/backend/` prefix, no monorepo `git diff` assumptions).
3. **Given** the validator toolchain, **When** it executes, **Then** it resolves against this
   repo's `src/` layout and its own `scripts/package.json` dependencies.

### User Story 3 - MCP serves the updated blueprint (Priority: P2)

An AI agent connected to the blueprint's MCP server retrieves patterns, conventions, templates,
provider docs, and skills — all reflecting the aligned state — from a single source of truth.

**Why this priority**: The MCP is how the blueprint reaches agents at runtime; it must expose the
new skills and updated docs, but it depends on US1/US2 content existing first.

**Independent Test**: Call the MCP's `list_skills`, `get_skill`, `list_patterns`, `get_pattern`,
`list_templates`, `get_template`, and `validate_module_structure` tools; confirm they return the
aligned content and that the required-folder set still validates a conformant module.

**Acceptance Scenarios**:

1. **Given** the MCP, **When** `list_skills` is called, **Then** the ported skills are listed.
2. **Given** the MCP, **When** `get_pattern`/`get_template` is called, **Then** the returned
   content reflects the new conventions.
3. **Given** the MCP, **When** `validate_module_structure` runs on the example module, **Then**
   it reports OK against the required folder set.
4. **Given** the server metadata, **When** inspected, **Then** the version is bumped from the
   current `0.3.0`.

### Edge Cases

- What happens to consumers relying on the old `@shared/schames/` path or the old
  `AsyncContext` class after they are renamed/replaced? (Breaking change — must be documented in
  CHANGELOG; blueprint is pre-1.0 so breaking changes are acceptable.)
- How does `backend-reviewer` behave when there are no changed backend files and no explicit
  `--files` argument? (Must exit cleanly without error.)
- What happens when the `zod` v3→v4 or `jest` 29→30 migration surfaces incompatibilities in
  existing example code or tests? (Migration must leave `pnpm check` and the test suite green.)
- How does the exception filter behave when Sentry is not configured (no DSN)? (Must degrade
  gracefully — no crash, capture is a no-op.)
- What happens if the GCS provider is selected without GCP credentials? (Clear configuration
  error, S3 remains the default working path.)

## Requirements *(mandatory)*

### Functional Requirements

**Sequencing**: The five workstreams are ordered by dependency. R1 (shared layer) and R2
(example module) are the foundation and MUST land first; R3 (config/tooling) can proceed in
parallel with R1/R2. R5 (docs, templates, MCP) MUST come last because templates and docs
describe the R1/R2 conventions and the MCP serves the R4 skills — it cannot be finalized until
those exist. R4 (skills) depends on R1/R2 conventions being settled (the reviewer validator
encodes them).

**Shared layer (R1)**

- **FR-001**: The shared schema folder MUST be renamed from `@shared/schames/` to
  `@shared/schemas/`, and a `uuid-param` schema MUST be added.
- **FR-002**: A `RequestContext` (AsyncLocalStorage-based) MUST be introduced under
  `@shared/context/`, replacing the existing `AsyncContext` class and request-context struct as
  the single source of request-scoped data.
- **FR-003**: A shared `BaseEntity` (providing `id`, `createdAt`, `updatedAt`, `deletedAt`) MUST
  be added under `@shared/entities/` and MUST NOT include any tenant/`tenantId` concept; entities
  MUST extend it instead of re-declaring those columns.
- **FR-004**: A Sentry observability module MUST be added under `@shared/observability/`, and the
  global exception filter MUST report unignored exceptions through it while degrading gracefully
  when unconfigured.
- **FR-005**: Shared decorators MUST live under `@shared/decorators/` (moved from the top-level
  `@decorators` location).
- **FR-006**: Password hashing MUST use argon2 (the bcrypt hasher is replaced).
- **FR-007**: The upload provider MUST offer a GCS provider in addition to the existing S3
  provider; S3 MUST remain the default.
- **FR-008**: Shared base classes MUST use object-parameter method signatures: repository
  (`create({data,id})`, `findById({id})`, `update({id,data,relations})`, `batchUpsert({...})`),
  presenter (`present({entity,options})`), and exception filter `shouldIgnore({...})`.
- **FR-009**: Shared interface names MUST carry the `Model` suffix (e.g. `IPaginationModel`,
  `IRepositoryModel`, `IRequestContextModel`); base repository find methods returning mapped
  models MUST return `Model | undefined`.
- **FR-010**: The base presenter MUST provide default implementations for
  `presentWithoutRelations` and `presentMany` and add a `presentSuccess()` helper; the base
  service `execute` MUST take a single `payload` argument (no `context` parameter).
- **FR-011**: The base application exception MUST read its context from `RequestContext` inside
  its constructor and MUST NOT accept a `context` parameter.

**Example module (R2)**

- **FR-012**: The `_example_orders` module MUST be updated to the new conventions: controllers
  drop the manual context-attach and single-arg the service call and add `@HttpCode` where
  appropriate; services drop the `context` parameter and add an in-service `validateDto()`
  Zod re-parse; repositories adopt object-param signatures (raw-TypeORM methods typed `| null`,
  mapped-model methods `| undefined`); presenters use object-param `present` and drop
  `@Injectable()` (wired via `useClass`); entities extend `BaseEntity`.
- **FR-013**: The example module's errors MUST be split into one class per `*.exception.ts` file
  (no grouped `order.errors.ts`), and `context` arguments MUST be removed from exception
  constructors and call sites.
- **FR-014**: The example module's model file MUST be renamed to `order.struct.ts` (interface
  `IOrderModel` retained), and its DTOs MUST be split into per-action files
  (`create-order.dto.ts`, `get-order.dto.ts`, etc.).
- **FR-015**: The `backoffice` module (already largely conformant) MUST be reconciled to the same
  conventions with minimal touch-ups.

**Config & tooling (R3)**

- **FR-016**: Prettier config MUST set `printWidth: 100`, `arrowParens: "always"`,
  `endOfLine: "lf"`, and a `.prettierignore` MUST be added.
- **FR-017**: The ESLint config and a local-rules module MUST be ported from chat-dgt and adapted
  to a single-package layout, enforcing: interface `I…Model`, enum `…Enum`, type-alias `T…`,
  `no-unused-vars` error, a controller `require-presenter-usage` rule, and a spec-file
  `unbound-method` override. React-specific plugins MUST be excluded.
- **FR-018**: `tsconfig.build.json` MUST exclude e2e spec files; the Jest config MUST add an 80%
  coverage threshold.
- **FR-019**: Portuguese source-code comments MUST be converted to English.
- **FR-020**: `zod` MUST be migrated from v3 to v4, with all schemas and dependent code updated
  so `pnpm check`, `pnpm lint`, and the test suite pass.
- **FR-020b**: `jest` MUST be migrated from v29 to v30, with the Jest config and all tests
  updated so the suite passes green.
- **FR-020c**: The `argon2` dependency MUST be added (supports FR-006).
- **FR-020d**: The `@sentry/node` dependency MUST be added (supports FR-004).
- **FR-020e**: The GCS SDK dependency MUST be added (supports FR-007).

**Skills (R4)**

- **FR-021**: The `backend-patterns-nestjs` skill MUST be ported with its scope banner adapted
  from the monorepo `apps/backend/` framing to this single-package repo.
- **FR-022**: The `backend-reviewer` skill (SKILL.md + `scripts/` validator toolchain:
  `pattern-validator.ts`, `types.ts`, `rules/{ast-rules,regex-rules,test-rules}.ts`) MUST be
  ported and adapted to single-package paths, dropping monorepo `apps/backend`/`backend` prefixes,
  monorepo `git diff` globs, and Stop-hook/`./tmp` skip-flag assumptions; `node_modules` MUST be
  excluded and restored from the toolchain's own `package.json`.
- **FR-023**: Both skills MUST be installed in both `.claude/skills/<name>/` (project auto-invoke)
  and the top-level `skills/<name>/` (MCP-served).

**Docs, templates, MCP (R5)**

- **FR-024**: All scaffolding templates (`templates/*.hbs`) MUST be updated to the new conventions
  (object-params, `RequestContext`, per-action DTOs, presenter object-param without `@Injectable`,
  `BaseEntity` extension).
- **FR-025**: `docs/patterns/*` and affected `docs/conventions/*` MUST be updated to describe the
  new conventions, and `docs/VERSION` MUST be bumped.
- **FR-026**: The MCP server (`mcp-server/src/index.ts`) MUST list/serve the ported skills, MUST
  keep `validate_module_structure`'s required-folder set consistent with the example module, and
  MUST bump its server `version` above `0.3.0`.
- **FR-027**: Breaking changes (renamed paths, replaced classes, dependency majors) MUST be
  recorded in `CHANGELOG.md`.

### Key Entities *(include if feature involves data)*

- **Blueprint convention set**: the documented rules (naming, file layout, method signatures)
  that both `docs/` and `templates/` must express consistently.
- **Skill**: a `SKILL.md` (+ optional `scripts/`) unit, present in `.claude/skills/` and `skills/`.
- **MCP tool surface**: the set of tools the server exposes over the blueprint content.
- **Request context**: the request-scoped data structure (`IRequestContextModel`) provided via
  AsyncLocalStorage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `pnpm check`, `pnpm lint`, and the full test suite pass with zero errors after all
  changes (coverage ≥ 80% per the new threshold).
- **SC-002**: 100% of the example module's controllers, services, repositories, presenters,
  entities, errors, and DTOs conform to the new conventions (verifiable by inspection and by
  `backend-reviewer` reporting zero violations).
- **SC-003**: Both `backend-patterns-nestjs` and `backend-reviewer` are discoverable and runnable
  in this repo, and `backend-reviewer` completes a review of a changed file with no reliance on
  monorepo paths or an external Stop-hook.
- **SC-004**: Every MCP content tool (`get_pattern`, `get_template`, `get_convention`,
  `get_skill`, `list_skills`, `validate_module_structure`) returns aligned content, and the
  server version is greater than `0.3.0`.
- **SC-005**: A module scaffolded purely from the updated templates passes `backend-reviewer`
  with zero violations without manual post-edits.
- **SC-006**: No monorepo-only assumption (multi-tenancy, OpenAI, `apps/backend` path, tenant
  columns) is introduced into the blueprint.

## Assumptions

- **Pre-1.0 breaking changes are acceptable**: the blueprint is at `0.1.0`; renames
  (`schames`→`schemas`), class replacements (`AsyncContext`→`RequestContext`,
  bcrypt→argon2), and dependency majors are allowed and recorded in the CHANGELOG rather than
  shimmed for backward compatibility.
- **tsconfig stays `commonjs`**: chat-dgt's `nodenext` module resolution is partly driven by its
  monorepo shape; the blueprint keeps `commonjs` unless a ported pattern proves to require
  `nodenext` (open thread from the brainstorm; default = no change).
- **typeorm stays on the standard `^0.3.x` line**: chat-dgt's `^1.0.0` is treated as an
  internal/aliased version and is not adopted; no ported pattern depends on it.
- **The older `skills/backend-patterns` is retired** in favor of `backend-patterns-nestjs` to
  avoid duplicate guidance in the MCP `list_skills` output (single canonical patterns skill).
- **`backend-reviewer` drops the Stop-hook skip-flag** because this repo has no equivalent Stop
  hook; the skill is invoked manually or by an agent, not by a hook loop.
- **Product-specific chat-dgt infra is out of scope**: multi-tenancy/`TenantContext`,
  tenant-aware base-entity seeding, OpenAI/LLM provider are explicitly excluded.
- **Sentry and GCS are optional at runtime**: absence of a Sentry DSN or GCP credentials must not
  break the default (S3 + no-op capture) path.
