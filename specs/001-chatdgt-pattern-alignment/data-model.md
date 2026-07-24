# Data Model: chat-dgt pattern alignment

This feature is a convention/tooling refactor, not a new business domain. The "entities" here are
the structural building blocks the blueprint defines and the artifacts it distributes.

## Core shared-layer structures

### RequestContext / `IRequestContextModel`
- **Home**: `src/@shared/context/request.context.ts`
- **Fields** (no tenant field — multi-tenancy excluded):
  - `requestId: string`
  - `userId?: string`
  - `startedAt: Date` (or epoch ms)
  - additional request-scoped metadata as needed (method, path)
- **Mechanism**: `AsyncLocalStorage<IRequestContextModel>`; `RequestContext.run(ctx, fn)`,
  `RequestContext.getContext()`, `RequestContext.getRequestId()`.
- **Replaces**: `@shared/classes/async-context.ts`, `@shared/protocols/request-context.struct.ts`.
- **Consumers**: request-context middleware (seeds it), exception base (reads it), filter,
  response-log interceptor.

### BaseEntity
- **Home**: `src/@shared/entities/base.entity.ts`
- **Columns**: `id` (uuid PK), `createdAt`, `updatedAt`, `deletedAt` (soft-delete). **No `tenantId`,
  no `@BeforeInsert` tenant seeding.**
- **Rule**: all TypeORM entities extend it instead of re-declaring these columns.

### AbstractRepository (edited)
- Interface renames: `IPagination→IPaginationModel`, `IRepository→IRepositoryModel`,
  `IBulkOperationOptions→…Model`, `IPostgreSQLError→…Model`, `IQueryPerformanceMetrics→…Model`.
- Object-param signatures: `create({data,id?})`, `findById({id})`, `update({id,data,relations?})`,
  `batchUpsert({dataArray,conflictColumns,…})`.
- Return-type rule: base mapped-model finders → `Model | undefined`; hand-written raw-TypeORM
  methods on concrete repos → `Entity | null`.

### AbstractPresenter (edited)
- `present({entity, options?})` object-param.
- `presentWithoutRelations` / `presentMany` gain **default implementations**.
- Adds `presentSuccess()` helper.
- Concrete presenters are plain classes (no `@Injectable`), wired via `useClass`.

### AbstractService (edited)
- `execute(payload)` — single argument (drop `context`).
- Adds `validateDto()` convention (in-service Zod re-parse → `Result.fail` on error).

### AbstractApplicationException (edited)
- Constructor `(message, name, statusCode)` — **no `context` param**; reads
  `RequestContext.getContext()` internally to populate `context`.

## Naming model (lint-enforced)

| Kind | Rule | Example |
|------|------|---------|
| interface | prefix `I`, suffix `Model` | `IOrderModel`, `IRepositoryModel` |
| type alias | prefix `T` | `TCreateOrderDto` |
| enum | suffix `Enum` | `OrderStatusEnum` |

Model files use the `.struct.ts` suffix (e.g. `order.struct.ts`). DTOs are one file per action
(`create-order.dto.ts`); exceptions one class per `*.exception.ts`.

## Skill (distribution artifact)
- **Shape**: `<name>/SKILL.md` (+ optional `scripts/`). Frontmatter: `name`, `description`.
- **Instances**: `backend-patterns-nestjs` (SKILL.md only), `backend-reviewer` (SKILL.md +
  `scripts/{pattern-validator,types}.ts` + `scripts/rules/{ast,regex,test}-rules.ts` +
  `scripts/package.json`, `tsconfig.json`; no `node_modules`).
- **Locations**: `.claude/skills/<name>/` (agent auto-invoke) AND `skills/<name>/` (MCP-served).

## MCP tool surface (see contracts/mcp-tools.contract.md)
- Content tools unchanged in shape; `list_skills`/`get_skill` now surface the ported skills.
- `validate_module_structure` required-folder set stays:
  `controllers, dto, entities, errors, models, presenters, repositories, services` + a `*.module.ts`.
- Server `version` bumped from `0.3.0`.

## State transitions
None (no stateful domain workflow). The only "transition" is the one-way pre-1.0 breaking
migration recorded in the CHANGELOG ledger (research.md).
