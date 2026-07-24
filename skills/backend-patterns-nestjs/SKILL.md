---
name: backend-patterns-nestjs
description: 'REQUIRED for any NestJS backend code in this repo. ALWAYS load before: creating or editing a controller, service, repository, entity, presenter, DTO, exception, or module under src/. Covers RequestContext (AsyncLocalStorage), BaseEntity, object-param AbstractRepository/AbstractPresenter/AbstractService, Result<T>, I.../T.../...Enum naming, per-action DTOs, one-exception-per-file, presenter wiring via useClass, argon2 hashing, and optional Sentry/GCS providers. Uses src/modules/_example_orders/ as the canonical reference implementation.'
---

# Backend Patterns — NestJS (nest-clean-blueprint)

Conventions for this NestJS + TypeORM + PostgreSQL backend. Everything lives directly under
`src/` — there is no `apps/backend` prefix, no monorepo, and no `apps/web` frontend to
cross-reference. The canonical worked example is `src/modules/_example_orders/` (all
paths and snippets below are lifted from it). Read it end to end before building a new
module; copy its shape rather than inventing a new one.

## Reference Architecture

```
Model (I<Entity>Model interface) → Entity (TypeORM, extends BaseEntity)
  → Repository (AbstractRepository) → Service (AbstractService, returns Result<T>)
  → Controller (throws) → Presenter (AbstractPresenter, shapes the HTTP response)
```

Every module follows this layered pattern with explicit DI tokens and object-param method
signatures. See `src/modules/_example_orders/` for a fully wired instance of every layer.

## Module Structure

```
src/modules/_example_orders/
├── controllers/    one file per action  (create-order.controller.ts, get-order.controller.ts, ...)
├── dto/            one Zod schema + type per action (create-order.dto.ts, list-orders.dto.ts, ...)
├── entities/       order.entity.ts — TypeORM @Entity extending BaseEntity
├── enums/          order-status.enum.ts — OrderStatusEnum
├── errors/         one exception class per file (order-not-found.exception.ts, ...)
├── models/         order.struct.ts — IOrderModel interface
├── presenters/     order.presenter.ts — IOrderPresenter (DI token) + OrderPresenter (impl)
├── repositories/   orders.repository.ts — IOrdersRepository (DI token) + OrdersRepository (impl)
├── services/       one file per action (create-order.service.ts, list-orders.service.ts, ...)
└── orders.module.ts
```

Naming conventions used throughout:

| Element              | Pattern                       | Example (from `_example_orders`)         |
| --------------------- | ----------------------------- | ----------------------------------------- |
| Model interface       | `I[Entity]Model`               | `IOrderModel` (`models/order.struct.ts`)  |
| Enum                  | `[Name]Enum`                   | `OrderStatusEnum`                         |
| Repository DI token   | `I[EntitiesPlural]Repository`  | `IOrdersRepository`                       |
| Presenter DI token    | `I[Entity]Presenter`           | `IOrderPresenter`                         |
| Service DI token      | `T[Action][Entity]Service`     | `TCreateOrderService`, `TListOrdersService`|
| Concrete service      | `[Action][Entity]Service`      | `CreateOrderService`                      |
| DTO schema            | `[action][Entity]DtoSchema`    | `createOrderDtoSchema`                    |
| DTO type              | `T[Action][Entity]Dto`         | `TCreateOrderDto`                         |
| Custom exception      | `[Reason]Exception`            | `OrderNotFoundException`, `OrderAlreadyCancelledException` |

Note: this repo names the model file `[entity].struct.ts` (not `.model.ts`) — follow
`models/order.struct.ts` exactly.

---

## RequestContext (AsyncLocalStorage — no tenant/multi-tenant concept)

`src/@shared/context/request.context.ts` wraps Node's `AsyncLocalStorage` to carry
per-request data (`requestId`, `userId`, `userTimezone`, `ip`, `userAgent`, ...) through the
entire async call chain without threading it through every method parameter. There is no
tenant/organization concept in this context — it is purely per-request correlation data.

```typescript
export class RequestContext {
  static run<T>(context: IRequestContextModel, fn: () => T): T { ... }
  static getContext(): IRequestContextModel | undefined { ... }
  static getRequestId(): string | undefined { ... }
  static getUserId(): string | undefined { ... }
}
```

- Seeded by the request middleware with a UUID on every incoming request.
- Never pass context through method params or decorators — call
  `RequestContext.getContext()` directly wherever it's needed (services, exceptions, logger).
- `AbstractApplicationException` reads `RequestContext.getContext()` itself in its
  constructor (see `src/@shared/errors/abstract-application-exception.ts`) — never pass
  `context` through exception constructors.

---

## BaseEntity

`src/@shared/entities/base.entity.ts` is the abstract base every TypeORM entity extends —
UUID primary key plus `created_at` / `updated_at` / `deleted_at` timestamp columns:

```typescript
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' }) deletedAt?: Date | null;
}
```

`src/modules/_example_orders/entities/order.entity.ts` shows the pattern: extend
`BaseEntity`, `implements I<Entity>Model`, index FK/status columns, store enums as
`varchar`:

```typescript
@Entity({ name: 'orders' })
export class OrderEntity extends BaseEntity implements IOrderModel {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  // Enums are stored as VARCHAR by convention.
  @Index()
  @Column({ type: 'varchar', length: 32, default: OrderStatusEnum.PENDING })
  status: OrderStatusEnum;
}
```

---

## Object-Param Base Classes

All three base classes in `src/@shared/classes/` use a single object parameter per method
(not positional args), and are wired into modules via `useClass` against an abstract DI
token — never inject the concrete class directly.

### AbstractRepository (`src/@shared/classes/repository.ts`)

Generic `AbstractRepository<Entity, Model>` implements the full CRUD + pagination +
bulk-operation surface (`create`, `find`, `findOne`, `findById`, `findLast`, `count`,
`update`, `softDelete`, `hardDelete`, `restoreSoftDeleted`, `queryBuilder`, `bulkCreate`,
`bulkUpdate`, `bulkUpdateWhere`, `bulkDelete`, `bulkDeleteWhere`, `batchUpsert`). Every
method takes one destructured object argument (e.g.
`find({ where, select, relations, order, offset, page, includeDeleted })`), not positional
args. It also owns cascade/soft-delete handling for related entities and slow-query logging.

Convention (from `src/modules/_example_orders/repositories/orders.repository.ts`): define
an abstract class as the DI token that *extends* `AbstractRepository` (so it doubles as
both the type and the token), then a concrete `@Injectable` class extends that token:

```typescript
export abstract class IOrdersRepository extends AbstractRepository<OrderEntity, IOrderModel> {}

@Injectable()
export class OrdersRepository extends IOrdersRepository {
  constructor(@InjectRepository(OrderEntity) repository: Repository<OrderEntity>, envService: TEnvService) {
    const logger: ILogger = new CustomLogger(envService, OrdersRepository.name);
    super(repository, envService, logger);
  }
}
```

Wire in the module with `useClass`:
```typescript
providers: [{ provide: IOrdersRepository, useClass: OrdersRepository }]
```

Pagination shape is `IPaginationModel<T>` (`{ data: T[]; hasNextPage: boolean; total?: number }`),
exported from the same file — list services return `Result<IPaginationModel<T>>`.

Use TypeORM operators directly (`IsNull`, `Not`, `MoreThan`, `In`, `Between`), never
MongoDB-style `{ $ne: null }`.

### AbstractPresenter (`src/@shared/classes/presenter.ts`)

```typescript
export abstract class AbstractPresenter<Model, Response> {
  abstract present({ entity, options }: { entity: Model; options?: any }): Response;
  presentWithoutRelations(entity: Model): Response { ... }
  presentMany({ entities, options }: { entities: Model[]; options?: any }): Response[] { ... }
  presentSuccess<T = void>(data?: T): { success: true; data?: T } { ... }
}
```

Presenters transform raw domain models into API response shapes. They live outside
services on purpose — **services return raw models, controllers call the presenter**.
`src/modules/_example_orders/presenters/order.presenter.ts`:

```typescript
export abstract class IOrderPresenter extends AbstractPresenter<IOrderModel, IOrderPresenterResponseModel> {}

export class OrderPresenter extends IOrderPresenter {
  present({ entity }: { entity: IOrderModel; options?: any }): IOrderPresenterResponseModel {
    return { id: entity.id, code: entity.code, /* ... */, createdAt: entity.createdAt.toISOString() };
  }
}
```

Note the concrete `OrderPresenter` class has **no `@Injectable()` decorator** — presenters
are plain classes, wired into the module purely through `{ provide: IOrderPresenter,
useClass: OrderPresenter }`. Controllers inject the `I<Entity>Presenter` token, never the
concrete class.

```typescript
// ❌ WRONG — presenter used inside a service
async execute(): Promise<Result<TOrderPresenterResponse>> {
  return Result.success(this.presenter.present({ entity: order })); // don't do this
}

// ✅ CORRECT — service returns the raw model, controller presents it
const result = await this.service.execute(dto);
if (result.error) throw result.error;
return this.orderPresenter.present({ entity: result.getValue()! });
```

### AbstractService (`src/@shared/classes/service.ts`)

```typescript
export abstract class AbstractService<Dto, Response> {
  logger?: ILogger;
  abstract execute(payload: Dto): Promise<Result<Response>>;
  static validateDto<T>(schema: ZodSchema<T>, payload: unknown): Result<T> | undefined { ... }
}
```

Every service exposes exactly one method, `execute(payload) => Promise<Result<Response>>`.
Services **never throw** — wrap errors in `Result.fail(...)`; only controllers throw.
`AbstractService.validateDto` is a `static` helper (so it doesn't force every implementing
class to declare it) that re-validates the DTO with its Zod schema and returns
`Result.fail(...)` on failure, or `undefined` when valid so the caller continues:

```typescript
// src/modules/_example_orders/services/create-order.service.ts
export abstract class TCreateOrderService extends AbstractService<TCreateOrderDto, IOrderModel> {}

@Injectable()
export class CreateOrderService implements TCreateOrderService {
  constructor(
    /// //////////////////////////
    //  Repositories
    /// //////////////////////////
    private ordersRepository: IOrdersRepository,

    /// //////////////////////////
    //  Providers
    /// //////////////////////////
    public logger: ILogger,
  ) {
    this.logger.setContextName(CreateOrderService.name);
  }

  async execute(dto: TCreateOrderDto): Promise<Result<IOrderModel>> {
    const invalid = AbstractService.validateDto(createOrderDtoSchema, dto);
    if (invalid) return Result.fail(invalid.error!);

    const order = await this.ordersRepository.create({ data: { /* ... */ } });
    return Result.success(order);
  }
}
```

Wire via `useClass` in the module: `{ provide: TCreateOrderService, useClass: CreateOrderService }`.

List services return `IPaginationModel<T>` and typically inject `TEnvService` for the
default page size (see `src/modules/_example_orders/services/list-orders.service.ts`).

---

## Result<T> Pattern (MANDATORY)

`src/@shared/classes/result.ts` — `Result<T>` wraps either a success value or an
`AbstractApplicationException | Error`. Frozen after construction.

```typescript
// ✅ Service returns Result, never throws
if (!found) return Result.fail(new OrderNotFoundException(id));
return Result.success(order);

// ✅ Controller unwraps and is the ONLY layer that throws
const result = await this.service.execute(dto);
if (result.error) {
  throw result.error;
}
return this.presenter.present({ entity: result.getValue()! });
```

---

## Controllers

Full route path lives in `@Controller`; HTTP method decorators stay empty when the whole
path (including params) is already there — see
`src/modules/_example_orders/controllers/get-order.controller.ts`:

```typescript
// ✅ CORRECT
@Controller('orders/:id')
export class GetOrderController {
  @Get() async getOrder(@Param(new ZodValidationPipe(getOrderDtoSchema)) param: TGetOrderDto) { ... }
}
```

Every `@Body()`, `@Query()`, `@Param()` uses `ZodValidationPipe` inline
(`@/@shared/pipes/zod-validation.pipe`):

```typescript
@Body(new ZodValidationPipe(createOrderDtoSchema)) dto: TCreateOrderDto,
```

Constructor deps are grouped with banner comments (`//  Services`, `//  Repositories`,
`//  Presenters`) as shown in every `_example_orders` controller/service.

---

## DTOs — one Zod schema per action

`src/modules/_example_orders/dto/create-order.dto.ts`:

```typescript
export const createOrderDtoSchema = z.object({
  customerName: z.string().min(1).max(255),
  amount: z.number().positive(),
});

export type TCreateOrderDto = z.infer<typeof createOrderDtoSchema>;
```

One DTO file per controller action (`create-order.dto.ts`, `get-order.dto.ts`,
`list-orders.dto.ts`, `update-order.dto.ts`, `delete-order.dto.ts`), each exporting a
`[action][Entity]DtoSchema` + `T[Action][Entity]Dto` pair. Each has a matching `.spec.ts`.

---

## Custom Exceptions — one exception per file

`src/@shared/errors/abstract-application-exception.ts`:

```typescript
export abstract class AbstractApplicationException extends Error {
  public statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
  public context?: IRequestContextModel;

  constructor(message: string, name?: string, statusCode?: number) {
    super(message);
    this.name = name || 'AbstractApplicationException';
    this.statusCode = statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    this.context = RequestContext.getContext(); // reads context itself — never pass it in
  }
}
```

Always extend this — never throw a raw `Error` from a service. Each exception gets its own
file under `errors/`, one class per file:

```typescript
// src/modules/_example_orders/errors/order-not-found.exception.ts
export class OrderNotFoundException extends AbstractApplicationException {
  constructor(id: string) {
    super(`Order with id ${id} not found`, 'OrderNotFoundException', HttpStatus.NOT_FOUND);
  }
}

// src/modules/_example_orders/errors/order-already-cancelled.exception.ts
export class OrderAlreadyCancelledException extends AbstractApplicationException {
  constructor(id: string) {
    super(`Order ${id} is already cancelled`, 'OrderAlreadyCancelledException', HttpStatus.CONFLICT);
  }
}
```

`DefaultException` (same file) is the generic fallback for cases without a domain-specific
class — prefer a named exception when the error is a real domain rule.

Test by class instance, never by message:

```typescript
expect(result.error).toBeInstanceOf(OrderNotFoundException); // ✅
expect(result.error?.message).toContain('not found'); // ❌
```

---

## Module wiring

`src/modules/_example_orders/orders.module.ts` shows the complete `useClass` wiring for a
module — every abstract token (repository, presenter, and each per-action service) is
registered against its concrete implementation:

```typescript
providers: [
  { provide: IOrdersRepository, useClass: OrdersRepository },
  { provide: IOrderPresenter, useClass: OrderPresenter },
  { provide: TCreateOrderService, useClass: CreateOrderService },
  { provide: TGetOrderService, useClass: GetOrderService },
  { provide: TListOrdersService, useClass: ListOrdersService },
  { provide: TUpdateOrderService, useClass: UpdateOrderService },
  { provide: TDeleteOrderService, useClass: DeleteOrderService },
],
```

---

## Logging & Request Correlation

`ILogger` (`src/@shared/classes/custom-logger.ts`) is the DI token; `CustomLogger` is the
concrete implementation (transient-scoped, wraps `ConsoleLogger` + winston, optionally
ships logs to S3). Set the context name in the constructor and call the logger directly —
context is read internally via `RequestContext`, not passed as a parameter:

```typescript
constructor(private ordersRepository: IOrdersRepository, public logger: ILogger) {
  this.logger.setContextName(CreateOrderService.name);
}

this.logger.log(`Creating order for ${dto.customerName}`);
this.logger.warn('Order below minimum');
this.logger.error(`Failed: ${error.message}`);
```

Never log sensitive fields (passwords, tokens, raw file content).

---

## Password Hashing — argon2

`src/@shared/modules/cryptography/services/argon2-hasher.service.ts` defines the
`THasher` DI token and `Argon2Hasher` implementation using `argon2.argon2id`:

```typescript
export abstract class THasher {
  abstract hash(plain: string): Promise<string>;
  abstract compare(plain: string, hash: string): Promise<boolean>;
}

@Injectable()
export class Argon2Hasher implements THasher {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }
  async compare(plain: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
```

Wired via `src/@shared/modules/cryptography/cryptography.module.ts`. Never hash with
anything other than this service — no bcrypt, no custom hashing.

---

## Optional: Sentry & GCS (feature-flagged by env, not always active)

- **Sentry** (`src/@shared/observability/sentry.ts`): `initSentry()` is a no-op unless
  `SENTRY_DSN` is set; `captureException(error)` is likewise a no-op until initialized.
  Called from `src/main.ts` and `src/@shared/filters/exceptions.filter.ts`. Don't assume
  Sentry is always configured — guard on `initialized`, as the module already does.
- **File storage** (`src/@shared/providers/upload-provider/`): `TUploadProvider` is the DI
  token; the module factory in `upload-provider.module.ts` picks `GcsStorageProvider` or
  `AwsS3StorageProvider` at runtime based on the `UPLOAD_PROVIDER` env var — inject
  `TUploadProvider`, never a concrete provider class directly.

---

## Quick Checklist

- [ ] Model interface `I[Entity]Model` in `models/[entity].struct.ts`
- [ ] Entity extends `BaseEntity`, `implements I[Entity]Model`, enums stored as `varchar`
- [ ] Repository: abstract token extends `AbstractRepository<Entity, Model>`, concrete class wired via `useClass`
- [ ] Presenter: abstract token extends `AbstractPresenter<Model, Response>`; concrete presenter has **no** `@Injectable()`, wired via `useClass`
- [ ] Service: abstract token `T[Action][Entity]Service extends AbstractService<Dto, Response>`; `execute()` never throws
- [ ] Service validates DTO via `AbstractService.validateDto(schema, payload)` before using it
- [ ] Controller has full route (incl. path params) in `@Controller(...)`; HTTP decorators empty
- [ ] All `@Body`/`@Query`/`@Param` wrapped in `new ZodValidationPipe(schema)`
- [ ] Controller is the only layer that throws (`if (result.error) throw result.error;`)
- [ ] Controller calls the presenter — services never format responses
- [ ] One Zod schema/type per action DTO file
- [ ] One exception class per file, extending `AbstractApplicationException`
- [ ] Constructor deps grouped with `//  Services` / `//  Repositories` / `//  Presenters` banner comments
- [ ] Logging via `ILogger`, never `console.log`; no sensitive fields logged
- [ ] Password hashing via `THasher`/`Argon2Hasher`, never bcrypt or ad hoc hashing
- [ ] Module registers every token with `useClass`
