# Architecture Blueprint

> Reference architecture for NestJS backends. Strict layered architecture, Result-based error handling, Zod-validated I/O, presenter-based response shaping, and Dependency Injection through explicit abstract tokens.

This blueprint is opinionated and battle-tested. Every section is a rule the codebase enforces. Examples use a fictional `orders` / `Order` module.

---

## Table of contents
1. [Layers](#1-layers)
2. [Naming conventions](#2-naming-conventions)
3. [Module structure](#3-module-structure)
4. [Result pattern (mandatory)](#4-result-pattern-mandatory)
5. [Dependency Injection via abstract tokens](#5-dependency-injection-via-abstract-tokens)
6. [Controller conventions](#6-controller-conventions)
7. [DTO validation with Zod (mandatory)](#7-dto-validation-with-zod-mandatory)
8. [Pagination (mandatory for list endpoints)](#8-pagination-mandatory-for-list-endpoints)
9. [Logging and request correlation](#9-logging-and-request-correlation)
10. [Custom exceptions](#10-custom-exceptions)

---

## 1. Layers

```
Model (interface)
  ↓
Entity (TypeORM @Entity)
  ↓
Repository (extends AbstractRepository<Entity, Model>)
  ↓
Service (returns Result<T>, never throws)
  ↓
Controller (handles HTTP, throws on Result.error)
  ↓
Presenter (shapes API response)
```

Each entity gets its own folder with this layer set. Cross-cutting concerns (auth, observability, providers) live in `@shared/`.

---

## 2. Naming conventions

| Element | Pattern | Example |
|---|---|---|
| File — service | `[action]-[entity].service.ts` | `create-order.service.ts` |
| File — model | `[entity].struct.ts` | `order.struct.ts` |
| Entity file | `[entity].entity.ts` | `order.entity.ts` |
| Repository file | `[entities-plural].repository.ts` | `orders.repository.ts` |
| Exception file (one class per file) | `[reason].exception.ts` | `order-not-found.exception.ts` |
| Abstract DI token | `T[Action][Entity]Service` | `TCreateOrderService` |
| Repository token | `I[EntitiesPlural]Repository` | `IOrdersRepository` |
| Model interface | `I[Entity]Model` | `IOrderModel` |
| Presenter token | `I[Entity]Presenter` | `IOrderPresenter` |
| Concrete class | `[Action][Entity]Service` | `CreateOrderService` |
| Custom exception class | `[Reason]Exception` | `OrderNotFoundException` |
| DTO schema | `[action][Entity]DtoSchema` | `createOrderDtoSchema` |
| DTO type alias | `T[Action][Entity]Dto` | `TCreateOrderDto` |

Every model interface is suffixed `Model` (`I...Model`) — never a bare `I...` interface.
One Zod schema/type pair per controller action file; one exception class per file. See
[docs/conventions/naming.md](./conventions/naming.md) for the full table.

---

## 3. Module structure

```
orders/
├── controllers/        one file per HTTP action
├── dto/                Zod schemas + type aliases
├── entities/           TypeORM @Entity classes
├── enums/
├── errors/             one exception class PER FILE, extending AbstractApplicationException
├── models/             I<Entity>Model interfaces (file named `[entity].struct.ts`)
├── presenters/         response shape transformers — abstract token + useClass, no @Injectable
├── repositories/       abstract token extends AbstractRepository
├── services/           one class per action
└── orders.module.ts    NestJS module
```

`src/modules/_example_orders/` is the canonical, fully wired reference — mirror its shape.

---

## 4. Result pattern (mandatory)

**Services return `Result<T>`. Services NEVER throw. Only controllers throw.**

```typescript
async execute(): Promise<Result<IOrderModel>> {
  const order = await this.repo.findById(id);
  if (!order) return Result.fail(new OrderNotFoundException(id));
  return Result.success(order);
}
```

Controllers unwrap and re-throw. There is no `context` parameter to attach —
`AbstractApplicationException` reads `RequestContext.getContext()` itself in its
constructor (see [§9](#9-logging-and-request-correlation)):

```typescript
const result = await this.service.execute(dto);
if (result.error) {
  throw result.error;
}
return this.presenter.present({ entity: result.getValue()! });
```

If a service calls another service, propagate failure: `if (inner.error) return Result.fail(inner.error);`

---

## 5. Dependency Injection via abstract tokens

Each service exposes an **abstract class token** (the `T...Service`). The module wires it via `useClass`. This decouples consumers from implementation and makes tests trivial to mock.

```typescript
// service file
export abstract class TCreateOrderService extends AbstractService<TCreateOrderDto, IOrderModel> {}

@Injectable()
export class CreateOrderService implements TCreateOrderService { /* … */ }

// module file
providers: [{ provide: TCreateOrderService, useClass: CreateOrderService }]

// consumer
constructor(private createOrderService: TCreateOrderService) {}
```

Presenters follow the identical pattern — abstract token extends `AbstractPresenter<Model,
Response>`, concrete class has **no** `@Injectable()`, wired via `useClass`:

```typescript
export abstract class IOrderPresenter extends AbstractPresenter<IOrderModel, IOrderPresenterResponseModel> {}
export class OrderPresenter extends IOrderPresenter { present({ entity }) { /* … */ } }

providers: [{ provide: IOrderPresenter, useClass: OrderPresenter }]
```

Group constructor dependencies with banner comments:

```typescript
constructor(
  /// //////////////////////////
  //  Services
  /// //////////////////////////
  private envService: TEnvService,
  private createOrderService: TCreateOrderService,

  /// //////////////////////////
  //  Repositories
  /// //////////////////////////
  private ordersRepository: IOrdersRepository,

  /// //////////////////////////
  //  Presenters
  /// //////////////////////////
  private orderPresenter: IOrderPresenter,

  public logger: ILogger,
) {}
```

---

## 6. Controller conventions

**Full path lives in `@Controller`. HTTP method decorators are empty.**

```typescript
@Controller('orders/:id')
export class GetOrderController {
  @Get() async getOrder(@Param('id') id: string) {} // ✅
}

// ❌ DON'T split the path
@Controller('orders')
export class GetOrderController {
  @Get(':id') async getOrder() {} // wrong
}
```

One controller per action keeps Swagger output and route ownership clear.

---

## 7. DTO validation with Zod (mandatory)

Every `@Body()`, `@Query()` and `@Param()` MUST be wrapped in `ZodValidationPipe` inline:

```typescript
async createOrder(
  @Body(new ZodValidationPipe(createOrderDtoSchema))
  dto: TCreateOrderDto,
) {}

async listOrders(
  @Query(new ZodValidationPipe(listOrdersDtoSchema))
  query: TListOrdersDto,
) {}

async getOrder(
  @Param(new ZodValidationPipe(getOrderDtoSchema))
  param: TGetOrderDto,
) {}
```

Each DTO file holds exactly one action's schema AND its inferred type — no DTO class, one
file per controller action (`create-order.dto.ts`, `get-order.dto.ts`, ...).

---

## 8. Pagination (mandatory for list endpoints)

List services MUST return `IPaginationModel<T>` (from `@/@shared/classes/repository`).
`AbstractRepository` itself sources the default page size from `TEnvService`
(`UTILITIES_PAGINATION_LIMIT`), so services simply forward `page`/`offset`:

```typescript
export abstract class TListOrdersService extends AbstractService<
  TListOrdersDto,
  IPaginationModel<IOrderModel>
> {}

async execute({ page, offset, status }: TListOrdersDto): Promise<Result<IPaginationModel<IOrderModel>>> {
  const where = status ? { status } : undefined;
  return Result.success(await this.ordersRepository.find({ where, page, offset }));
}
```

---

## 9. Logging and request correlation

`RequestContextMiddleware` runs first and seeds `RequestContext` (an `AsyncLocalStorage`
wrapper, see [docs/patterns/request-context.md](./patterns/request-context.md)) with a
UUID Correlation ID. Every log line gets tagged automatically:

```
[CreateOrderService][b1cb6536-2d7a-49eb-b822-c374c34bdac8] Creating order for John Doe
```

Inject `ILogger` (the DI token; `CustomLogger` is the concrete implementation) and set the
context name in the constructor — never pass request context as a parameter, it's read
internally via `RequestContext`:

```typescript
constructor(private ordersRepository: IOrdersRepository, public logger: ILogger) {
  this.logger.setContextName(CreateOrderService.name);
}

this.logger.log(`Creating order for ${dto.customerName}`);
this.logger.warn('Order is below minimum amount');
this.logger.error(`Failed: ${error.message}`);
```

---

## 10. Custom exceptions

Every domain error extends `AbstractApplicationException`, one exception class per file
under `errors/`. There is no `context` constructor parameter — the base class reads
`RequestContext.getContext()` internally:

```typescript
// errors/order-not-found.exception.ts
export class OrderNotFoundException extends AbstractApplicationException {
  constructor(id: string) {
    super(`Order with id ${id} not found`, 'OrderNotFoundException', HttpStatus.NOT_FOUND);
  }
}
```

Tests assert by class instance, never by message:

```typescript
expect(result.error).toBeInstanceOf(OrderNotFoundException); // ✅
expect(result.error?.message).toContain('not found');         // ❌
```

---

## Where to go next

- [docs/patterns/](./patterns/) — deep dives on each pattern.
- [docs/conventions/](./conventions/) — naming, module structure, testing.
- [docs/providers/](./providers/) — mail, encrypt-decrypt, upload providers.
- [docs/checklist-pr.md](./checklist-pr.md) — mandatory checks before opening a PR.
