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
| File | `[action]-[entity].service.ts` | `create-order.service.ts` |
| Entity file | `[entity].entity.ts` | `order.entity.ts` |
| Repository file | `[entities-plural].repository.ts` | `orders.repository.ts` |
| Abstract DI token | `T[Action][Entity]Service` | `TCreateOrderService` |
| Repository token | `I[EntitiesPlural]Repository` | `IOrdersRepository` |
| Model interface | `I[Entity]Model` | `IOrderModel` |
| Presenter token | `I[Entity]Presenter` | `IOrderPresenter` |
| Concrete class | `[Action][Entity]Service` | `CreateOrderService` |
| DTO schema | `[action][Entity]Dto[Type]Schema` | `createOrderDtoBodySchema` |
| DTO type alias | `T[Action][Entity]Dto[Type]Schema` | `TCreateOrderDtoBodySchema` |

`Type` ∈ `Body` · `Query` · `Param` · `Service`.

---

## 3. Module structure

```
orders/
├── controllers/        one file per HTTP action
├── dto/                Zod schemas + type aliases
├── entities/           TypeORM @Entity classes
├── enums/
├── errors/             custom exceptions
├── models/             I<Entity>Model interfaces
├── presenters/         response shape transformers
├── repositories/       extends AbstractRepository
├── services/           one class per action
└── orders.module.ts    NestJS module
```

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

Controllers unwrap and re-throw with context attached:

```typescript
const result = await this.service.execute(dto, context);
if (result.error) {
  if (result.error instanceof AbstractApplicationException) {
    result.error.context = context;
  }
  throw result.error;
}
return this.presenter.present(result.getValue()!);
```

If a service calls another service, propagate failure: `if (inner.error) return Result.fail(inner.error);`

---

## 5. Dependency Injection via abstract tokens

Each service exposes an **abstract class token** (the `T...Service`). The module wires it via `useClass`. This decouples consumers from implementation and makes tests trivial to mock.

```typescript
// service file
export abstract class TCreateOrderService extends AbstractService<TCreateOrderDtoServiceSchema, IOrderModel> {}

@Injectable()
export class CreateOrderService implements TCreateOrderService { /* … */ }

// module file
providers: [{ provide: TCreateOrderService, useClass: CreateOrderService }]

// consumer
constructor(private createOrderService: TCreateOrderService) {}
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
  @Body(new ZodValidationPipe(createOrderDtoBodySchema))
  dto: TCreateOrderDtoBodySchema,
) {}

async listOrders(
  @Query(new ZodValidationPipe(listOrdersDtoQuerySchema))
  query: TListOrdersDtoQuerySchema,
) {}

async getOrder(
  @Param(new ZodValidationPipe(getOrderDtoParamSchema))
  param: TGetOrderDtoParamSchema,
) {}
```

DTO file holds the schema AND the inferred type — no DTO class.

---

## 8. Pagination (mandatory for list endpoints)

List services MUST return `IPagination<T>` and inject `TEnvService` to read the default page size:

```typescript
export abstract class TListOrdersService extends AbstractService<
  TListOrdersDtoServiceSchema,
  IPagination<IOrderModel>
> {}

async execute({
  page = 1,
  offset = this.envService.get('UTILITIES_PAGINATION_LIMIT'),
  status,
}: TListOrdersDtoServiceSchema): Promise<Result<IPagination<IOrderModel>>> {
  return Result.success(await this.repo.find({ where: { status }, page, offset }));
}
```

---

## 9. Logging and request correlation

`RequestIdMiddleware` runs first and seeds `AsyncContext` with a UUID Correlation ID. Every log line gets tagged automatically:

```
[CreateOrderService][b1cb6536-2d7a-49eb-b822-c374c34bdac8] Creating order for John Doe
```

Use `ILogger` everywhere:

```typescript
public logger: ILogger = new CustomLogger(CreateOrderService.name);

this.logger.log(`Creating order: ${JSON.stringify(dto)}`, context);
this.logger.warn('Order is below minimum amount', context);
this.logger.error(`Failed: ${error.message}`, context);
```

---

## 10. Custom exceptions

Every domain error extends `AbstractApplicationException`:

```typescript
export class OrderNotFoundException extends AbstractApplicationException {
  constructor(id: string, context?: IRequestContext) {
    super(`Order with id ${id} not found`, 'OrderNotFoundException', HttpStatus.NOT_FOUND, context);
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
