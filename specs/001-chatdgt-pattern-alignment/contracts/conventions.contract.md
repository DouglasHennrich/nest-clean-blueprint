# Contract: Blueprint Convention Set

The rules every scaffolded/edited module MUST satisfy. This is the contract `backend-reviewer`
enforces and `docs/` + `templates/` must express. Verifiable by lint + validator + inspection.

## Controller
- `@Controller('full/path')` holds the complete route; HTTP-method decorators are empty.
- Every `@Body`/`@Query`/`@Param` uses `ZodValidationPipe` inline.
- Calls `service.execute(dto)` with a **single argument**; no `@ReqContext()` param, no manual
  `result.error.context = …`.
- `if (result.error) throw result.error;` then returns via a **presenter method** (enforced by the
  `require-presenter-usage` local rule). `@HttpCode(HttpStatus.OK)` on non-201 verbs.

## Service
- Token `T<Action>Service extends AbstractService<Input, Output>`; `@Injectable()` impl.
- Returns `Result<T>` (never throws). `execute(payload)` single-arg.
- Provides `validateDto()` (Zod re-parse → `Result.fail` on failure).

## Repository
- Abstract token `I<Entities>Repository extends AbstractRepository<Entity, Model>`; concrete
  `@Injectable` wired `useClass`.
- Object-param signatures. Base mapped finders return `Model | undefined`; custom raw-TypeORM
  methods return `Entity | null`.

## Presenter
- Plain class (no `@Injectable`), `useClass`-wired. `present({entity, options?})`.
- Domain methods (`presentOrder`, `presentMany`).

## Entity / Model
- `class XEntity extends BaseEntity implements IXModel`. No re-declared id/timestamps. No tenant.
- Model interface `IXModel` lives in `models/x.struct.ts`.

## Errors
- One class per `*.exception.ts`, extends `AbstractApplicationException`, `super(msg, name, status)`
  — no context arg.

## DTO
- One file per action: `<action>-<entity>.dto.ts`. `export const xDtoSchema = z.object({…})` +
  `export type TXDto = z.infer<typeof xDtoSchema>`; service schema via `.extend()`.

## Naming (lint-enforced)
- interface `I…Model`, type alias `T…`, enum `…Enum`.

## Acceptance
- `pnpm check` + `pnpm lint` clean; `backend-reviewer` reports zero violations on the example
  module AND on a module freshly rendered from `templates/*.hbs` (SC-005).
