# Implementation Plan: Align blueprint with chat-dgt backend patterns

**Branch**: `001-chatdgt-pattern-alignment` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-chatdgt-pattern-alignment/spec.md`

## Summary

Bring `nest-clean-blueprint` (a NestJS bootstrap / code-style guide consumed via an MCP server)
into line with the current universal patterns of `chat-dgt/apps/backend`, without importing
chat-dgt's product-specific infra. Work spans five sequenced workstreams: R1 shared-layer
refactor (RequestContext, BaseEntity, object-param base classes, `I…Model` naming, argon2, GCS,
Sentry, `schemas` rename), R2 example-module alignment (`_example_orders` + `backoffice`), R3
config/tooling (ported ESLint + local rules, prettier, jest coverage, zod v4, jest 30), R4 skills
(port `backend-patterns-nestjs` + `backend-reviewer` with adapted validator), R5 docs/templates/MCP
sync. Approach = in-place refactor of existing single-package source; the example module and
templates are the canonical outputs that `backend-reviewer` must validate clean.

## Technical Context

**Language/Version**: TypeScript ^5.6 on Node (`.nvmrc`), NestJS ^11, `commonjs` modules (unchanged per spec assumption).

**Primary Dependencies**: NestJS 11, TypeORM ^0.3.x (unchanged), Zod (v3→**v4**), BullMQ, CASL, `@aws-sdk/*` (S3/SES), **argon2** (replacing bcryptjs), **@sentry/node** (new), **@google-cloud/storage** (new, GCS upload provider), ts-morph (backend-reviewer validator).

**Storage**: PostgreSQL via TypeORM (unchanged); Redis (cache/queues) unchanged.

**Testing**: Jest (v29→**v30**) — unit `*.spec.ts`, e2e `*.spec.e2e.ts`; new coverage threshold 80%.

**Target Platform**: Linux server (NestJS HTTP app) + Node MCP server over stdio.

**Project Type**: Single-package backend blueprint + companion MCP server (`mcp-server/`) + skills (`.claude/skills/`, `skills/`) + docs/templates.

**Performance Goals**: N/A (blueprint/tooling; success is convention conformance + green build, not runtime throughput).

**Constraints**: Pre-1.0 — breaking changes allowed, recorded in CHANGELOG. Sentry/GCS must degrade gracefully when unconfigured (S3 + no-op capture remain the working default). No monorepo assumptions (no `apps/backend` paths, no multi-tenancy, no OpenAI).

**Scale/Scope**: ~52 `src/` directories; 2 feature modules (`_example_orders`, `backoffice`); 8 `templates/*.hbs`; ~20 `docs/` files; 1 MCP server; 2 ported skills (one with a 4-file validator toolchain).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unmodified template (no ratified principles). No project
constitution gates apply. **PASS** (nothing to violate). Re-checked post-design: still **PASS** —
the plan introduces no new architectural complexity beyond what the spec already scopes.

## Project Structure

### Documentation (this feature)

```text
specs/001-chatdgt-pattern-alignment/
├── plan.md              # This file
├── research.md          # Phase 0 — resolves the 4 spec-assumption open threads + porting decisions
├── data-model.md        # Phase 1 — RequestContext, BaseEntity, convention/naming model, skill+MCP entities
├── quickstart.md        # Phase 1 — how to validate the aligned blueprint end-to-end
├── contracts/           # Phase 1 — convention contract, skill contract, MCP tool-surface contract
│   ├── conventions.contract.md
│   ├── skills.contract.md
│   └── mcp-tools.contract.md
├── checklists/
│   └── requirements.md  # (from /speckit-specify)
└── tasks.md             # /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
src/
├── @shared/
│   ├── context/            # NEW — request.context.ts (RequestContext, IRequestContextModel)
│   ├── entities/           # NEW — base.entity.ts (id/createdAt/updatedAt/deletedAt, no tenantId)
│   ├── observability/      # NEW — sentry.ts (captureException, init, no-op when unconfigured)
│   ├── decorators/         # NEW home — moved from src/@decorators (current-user, public, request-context)
│   ├── schemas/            # RENAMED from @shared/schames (+ uuid-param.schema.ts)
│   ├── classes/            # EDIT — repository.ts, presenter.ts, service.ts → object-params, I…Model
│   ├── errors/             # EDIT — abstract-application-exception.ts reads RequestContext, drops param
│   ├── filters/            # EDIT — exceptions.filter.ts → RequestContext + Sentry, shouldIgnore({…})
│   ├── providers/
│   │   ├── upload-provider/ # EDIT — add gcs.provider.ts alongside aws-s3.provider.ts
│   │   └── mail-provider/   # unchanged (AWS SES/EJS)
│   └── modules/cryptography/ # EDIT — argon2-hasher.service.ts replaces bcrypt-hasher.service.ts
├── @decorators/            # REMOVED (moved into @shared/decorators)
└── modules/
    ├── _example_orders/    # EDIT — canonical scaffold to full new conventions
    └── backoffice/         # EDIT — minor reconciliation

# Tooling / meta (repository root)
eslint.config.mjs           # REPLACED — ported from chat-dgt, single-package
eslint-local-rules/         # NEW — require-presenter-usage (adapted)
.prettierrc, .prettierignore # EDIT / NEW
tsconfig.build.json          # EDIT — exclude e2e specs
jest.config.js               # EDIT — coverageThreshold 80
package.json                 # EDIT — zod v4, jest 30, +argon2 +@sentry/node +@google-cloud/storage, -bcryptjs
CHANGELOG.md                 # EDIT — record breaking changes

# Blueprint distribution surface
templates/*.hbs             # EDIT — all 8 to new conventions
docs/patterns/*, docs/conventions/*, docs/VERSION  # EDIT
.claude/skills/backend-patterns-nestjs/, backend-reviewer/  # NEW (ported)
skills/backend-patterns-nestjs/, backend-reviewer/          # NEW (ported, MCP-served)
skills/backend-patterns/    # REMOVED (retired per assumption)
mcp-server/src/index.ts     # EDIT — skill wiring, validate_module_structure, version bump
```

**Structure Decision**: Single-package in-place refactor (no new project, no monorepo). The
existing `src/@shared` + `src/modules` layout is preserved and extended; the MCP server and skills
directories are updated in place. Sequencing follows the spec's dependency note (R1/R2 → R3 parallel
→ R4 → R5).

## Complexity Tracking

No constitution violations — table not applicable.
