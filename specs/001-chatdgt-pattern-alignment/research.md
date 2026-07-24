# Research: chat-dgt pattern alignment

Phase 0 output. Resolves the spec's open assumptions and the non-obvious porting decisions.
No `NEEDS CLARIFICATION` remained after the brainstorm; each item below records the decision,
rationale, and rejected alternatives.

## D1 — Module system: keep `commonjs`

- **Decision**: Keep `tsconfig` on `module: commonjs`; do NOT migrate to `nodenext`.
- **Rationale**: chat-dgt's `nodenext` is coupled to its monorepo `tsconfig.base.json` and
  `@chat-dgt/shared` package-exports resolution. The blueprint is single-package with a `@/*`
  alias; none of the ported patterns (RequestContext, object-params, presenters, Zod v4) require
  ESM/`nodenext`. Migrating would force `.js` import specifiers and churn every import for no
  pattern benefit.
- **Alternatives rejected**: Full `nodenext` migration (high churn, no payoff); `esnext` (same).

## D2 — TypeORM stays `^0.3.x`

- **Decision**: Do not adopt chat-dgt's `typeorm@^1.0.0`.
- **Rationale**: `typeorm@1.x` is not a real public release line at the reference date; chat-dgt's
  entry is almost certainly an internal/aliased pin. The base `AbstractRepository` API used by the
  ported patterns exists identically on `0.3.x`. Object-param method signatures are a
  blueprint-side convention, independent of the TypeORM version.
- **Alternatives rejected**: Match `^1.0.0` (unresolvable/aliased, risky).

## D3 — Zod v3 → v4 migration

- **Decision**: Upgrade to `zod@^4`; audit every schema + `z.infer` usage and the
  `ZodValidationPipe` / `validateDto` re-parse path.
- **Rationale**: chat-dgt is on v4; the ported patterns' `xDtoServiceSchema` `.extend()` idiom and
  the in-service `validateDto()` re-parse both depend on v4 error/parse shape. `zod-validation-error`
  compatibility with v4 must be confirmed during implementation.
- **Watch items**: `.strict()`/`.passthrough()` behavior, error `.issues` shape consumed by the
  exception filter, `z.infer` type changes. Migration is done when `pnpm check` + tests are green.
- **Alternatives rejected**: Stay on v3 (drifts from source of truth; spec explicitly bumps).

## D4 — Jest 29 → 30 migration

- **Decision**: Upgrade `jest`/`@types/jest`/`ts-jest` to the 30 line; add `coverageThreshold` 80%.
- **Rationale**: Aligns with chat-dgt; coverage gate matches SC-001. ts-jest transform config and
  `@jest/globals` imports must be verified against v30.
- **Watch items**: ts-jest peer range, snapshot format, default `testEnvironment`.
- **Alternatives rejected**: Keep 29 (spec bumps; coverage gate desired).

## D5 — Retire the old `skills/backend-patterns`

- **Decision**: Remove `skills/backend-patterns` in favor of the ported `backend-patterns-nestjs`.
- **Rationale**: Both cover the same NestJS patterns; keeping both duplicates guidance and pollutes
  MCP `list_skills`. `backend-patterns-nestjs` is the source-of-truth version. Any unique content
  in the old skill is folded into the ported one before deletion.
- **Alternatives rejected**: Keep both (duplication, conflicting guidance).

## D6 — `backend-reviewer` adaptation to single-package

- **Decision**: Port SKILL.md + `scripts/` (`pattern-validator.ts`, `types.ts`,
  `rules/{ast,regex,test}-rules.ts`). Rewrite path assumptions:
  - Change detection: `git diff --name-only HEAD | grep '^src/.*\.ts$'` (drop `apps/backend/` prefix).
  - Commands: `pnpm check` / `pnpm lint` at repo root (drop `cd apps/backend`).
  - Validator invocation path: `.claude/skills/backend-reviewer/scripts` (this repo).
  - **Drop the Stop-hook `./tmp/.backend-reviewer-skip` mechanism** — this repo has no Stop hook;
    the skill is invoked manually or by an agent, so the loop-guard is unnecessary.
  - Exclude `node_modules/`; restore via the toolchain's own `scripts/package.json`
    (`ts-morph`, `fast-glob`, `ts-node`, `typescript`).
- **Rationale**: The validator logic (ast/regex/test rules) is repo-agnostic; only paths and the
  hook glue are monorepo-specific.
- **Watch items**: `ts-morph` must resolve this repo's `tsconfig.json` (`@/*` alias); rule set must
  reflect the *blueprint's* conventions (e.g. `IOrderModel`, object-params) so a template-scaffolded
  module passes clean (SC-005).
- **Alternatives rejected**: Guidance-only port (loses the deterministic automation the user wants).

## D7 — RequestContext as the enabling pattern

- **Decision**: Introduce `@shared/context/RequestContext` (AsyncLocalStorage) first; it unblocks
  controllers (drop manual `error.context` attach), services (drop `execute(payload, context)`
  second arg), and exceptions (constructor reads `RequestContext.getContext()`).
- **Rationale**: The module-pattern diff identified this as the single change that brings the
  controller/service/exception trio into line together. It replaces the existing `AsyncContext`
  class + `protocols/request-context.struct.ts` and the `@ReqContext()` param decorator's manual use.
- **Scope guard**: Provide `IRequestContextModel` WITHOUT any tenant field (no multi-tenancy).
- **Alternatives rejected**: Keep `AsyncContext` + manual threading (leaves the divergence in place).

## D8 — Sentry & GCS are optional at runtime

- **Decision**: `@shared/observability/sentry.ts` initializes only when a DSN is configured;
  `captureException` is a no-op otherwise. GCS provider is registered alongside S3; S3 stays default.
- **Rationale**: The blueprint must build and run with zero cloud credentials (SC-006 generic).
  Env schema (`modules/env`) gains optional `SENTRY_DSN` and GCS keys.
- **Alternatives rejected**: Hard-require DSN/GCP creds (breaks the default dev path).

## D9 — argon2 replaces bcrypt

- **Decision**: `argon2-hasher.service.ts` implements the existing hasher port; remove
  `bcrypt-hasher.service.ts` and `bcryptjs`. Update DI wiring + auth service references.
- **Rationale**: Matches chat-dgt; argon2id is the current recommended default. Port interface is
  unchanged, so call sites are stable.
- **Watch items**: `argon2` is a native module — ensure it installs in the Docker image; update
  `Dockerfile` build deps if needed.
- **Alternatives rejected**: Keep bcrypt (spec explicitly swaps).

## Cross-cutting: breaking-change ledger

All of the following are breaking and MUST be recorded in `CHANGELOG.md` (pre-1.0, no shims):
`@shared/schames`→`@shared/schemas`; `AsyncContext`→`RequestContext`; `@decorators/*`→
`@shared/decorators/*`; bcrypt→argon2 hasher; base-class positional→object-param signatures;
`I…`→`I…Model` interface renames; `skills/backend-patterns` removed.
