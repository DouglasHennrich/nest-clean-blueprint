# PR checklist (mandatory)

Use this list before opening a Pull Request. Reviewers should reject PRs that fail any item.

## Architecture

- [ ] Every service returns `Result<T>` and never throws.
- [ ] Only controllers throw, and they attach `context` before throwing if the error is an `AbstractApplicationException`.
- [ ] Services do NOT call presenters — controllers do.
- [ ] List services return `IPagination<T>` and inject `TEnvService` for the default `offset`.
- [ ] List controllers wrap `presentMany(data)` and forward `hasNextPage` / `total`.
- [ ] Each new service exposes an abstract `T...Service` token; the module wires it via `useClass`.
- [ ] Each new repository exposes an abstract `I...Repository` token (extending `AbstractRepository`); the module wires it via `useClass`.
- [ ] Each new presenter exposes an abstract `I...Presenter` token; the module wires it via `useClass`.

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
- [ ] Errors accept `context?: IRequestContext` in their constructor and forward to `super`.
- [ ] HTTP status codes are explicit (NOT `HttpStatus.INTERNAL_SERVER_ERROR` for expected failures).

## Logging

- [ ] Every service has `public logger: ILogger = new CustomLogger(ClassName.name)`.
- [ ] At least one `logger.log(...)` at the entry of `execute`.
- [ ] Errors logged at `warn` (recoverable) or `error` (unexpected).

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
- [ ] Coverage does not regress.

## Security

- [ ] No secrets in code or commit messages.
- [ ] All endpoint inputs validated with Zod (no raw `req.body` reads).
- [ ] CASL or equivalent authorization guard applied where appropriate.
- [ ] Encrypted fields (PII / tokens) go through `TEncryptDecryptProvider`.

## Build

- [ ] `pnpm check` passes (`tsc --noEmit`).
- [ ] `pnpm lint` passes.
- [ ] `pnpm test:unit` passes.
- [ ] No `console.log` left over — use `ILogger`.
