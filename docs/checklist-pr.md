# PR checklist (mandatory)

Use this list before opening a Pull Request. Reviewers should reject PRs that fail any item.

## Architecture

- [ ] Every service returns `Result<T>` and never throws.
- [ ] Only controllers throw (`if (result.error) throw result.error;`) — no `context` to attach; `AbstractApplicationException` reads `RequestContext.getContext()` internally.
- [ ] Services do NOT call presenters — controllers do (`this.orderPresenter.present({ entity: result.getValue()! })`).
- [ ] List services return `IPaginationModel<T>` (from `@/@shared/classes/repository`); `AbstractRepository` sources the default `offset` from `TEnvService` internally.
- [ ] List controllers wrap `presentMany({ entities: page.data })` and forward `hasNextPage` / `total`.
- [ ] Each new service exposes an abstract `T...Service` token (extending `AbstractService<Dto, Response>`); the module wires it via `useClass`.
- [ ] Each new repository exposes an abstract `I...Repository` token (extending `AbstractRepository<Entity, Model>`); the module wires it via `useClass`.
- [ ] Each new presenter exposes an abstract `I...Presenter` token (extending `AbstractPresenter<Model, Response>`); the concrete class has **no** `@Injectable()`; the module wires it via `useClass`.
- [ ] Every model interface is `I...Model` (never a bare `I...` interface).

## Controllers

- [ ] Full path lives in `@Controller`. HTTP method decorators (`@Get` `@Post` `@Patch` `@Delete`) are empty.
- [ ] Every `@Body()`, `@Query()` and `@Param()` is wrapped in `new ZodValidationPipe(...)` inline.
- [ ] DELETE endpoints return `204 No Content` via `@HttpCode(HttpStatus.NO_CONTENT)`.

## DTOs

- [ ] Each schema has a matching `T...Schema` type alias inferred via `z.infer`.
- [ ] Query DTOs use `z.coerce.number()` for numeric fields.
- [ ] Service DTOs separate from controller DTOs when shape differs (e.g. update merges param + body).

## Errors

- [ ] Every domain error extends `AbstractApplicationException`.
- [ ] One exception class per file under `errors/` (never multiple classes grouped in a single `[entity].errors.ts` file).
- [ ] Errors do NOT accept a `context` constructor parameter — `AbstractApplicationException` reads `RequestContext.getContext()` internally.
- [ ] HTTP status codes are explicit (NOT `HttpStatus.INTERNAL_SERVER_ERROR` for expected failures).

## Logging

- [ ] Every service injects `public logger: ILogger` (the DI token) and calls `this.logger.setContextName(ClassName.name)` in the constructor — never `new CustomLogger(...)` directly.
- [ ] At least one `logger.log(...)` at the entry of `execute`.
- [ ] Errors logged at `warn` (recoverable) or `error` (unexpected).
- [ ] No request context threaded through logger calls — `CustomLogger` reads `RequestContext` internally.

## Database

- [ ] Migration created manually (NEVER generated): `pnpm migration:create <Name>`.
- [ ] Enum columns use `varchar`, NOT Postgres native enum.
- [ ] Soft delete supported (`@DeleteDateColumn deletedAt`) when applicable.
- [ ] Indexes added on FKs and frequently-filtered columns.

## Tests

- [ ] At least one unit test per service.
- [ ] Errors asserted via `toBeInstanceOf(SomeException)` — never via message contents.
- [ ] Test data built with factories from `tests/factories/`.
- [ ] Mocks use the abstract token (`{ provide: TCreateOrderService, useValue: ... }`).
- [ ] Coverage stays at or above the 80% global threshold (branches/functions/lines/statements) enforced by `jest.config.js`.

## Security

- [ ] No secrets in code or commit messages.
- [ ] All endpoint inputs validated with Zod (no raw `req.body` reads).
- [ ] CASL or equivalent authorization guard applied where appropriate.
- [ ] Encrypted fields (PII / tokens) go through `TEncryptDecryptProvider`.
- [ ] Passwords hashed via `THasher` (`Argon2Hasher`, `argon2.argon2id`) — never bcrypt or ad hoc hashing.

## Build

- [ ] `pnpm check` passes (`tsc --noEmit`).
- [ ] `pnpm lint` passes.
- [ ] `pnpm test:unit` passes.
- [ ] No `console.log` left over — use `ILogger`.
