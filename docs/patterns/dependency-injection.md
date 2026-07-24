# Dependency Injection via abstract tokens

Every service, repository and presenter is consumed through an **abstract class token**, never the concrete class. The module wires the binding via `useClass`.

## Why

- Consumers depend on the contract, not the implementation.
- Test mocks just replace the binding: `{ provide: TCreateOrderService, useValue: mock }`.
- Refactoring to a different implementation (e.g. swap S3 for local FS) doesn't ripple.

## Pattern

```typescript
// service file
export abstract class TCreateOrderService extends AbstractService<TCreateOrderDto, IOrderModel> {}

@Injectable()
export class CreateOrderService implements TCreateOrderService {
  async execute(dto: TCreateOrderDto): Promise<Result<IOrderModel>> { /* … */ }
}

// module
providers: [{ provide: TCreateOrderService, useClass: CreateOrderService }]

// consumer
constructor(private createOrderService: TCreateOrderService) {}
```

## Repository pattern variant

Repository tokens **extend** `AbstractRepository` so the token doubles as the type:

```typescript
export abstract class IOrdersRepository extends AbstractRepository<OrderEntity, IOrderModel> {}

@Injectable()
export class OrdersRepository extends IOrdersRepository {
  constructor(@InjectRepository(OrderEntity) repo, env, logger) {
    super(repo, env, logger);
  }
}
```

## Presenter pattern variant

Presenter tokens **extend** `AbstractPresenter<Model, Response>` the same way. The concrete
class has **no `@Injectable()`** — presenters are plain classes wired purely through the
module's `useClass` binding:

```typescript
export abstract class IOrderPresenter extends AbstractPresenter<
  IOrderModel,
  IOrderPresenterResponseModel
> {}

export class OrderPresenter extends IOrderPresenter {
  present({ entity }: { entity: IOrderModel; options?: any }): IOrderPresenterResponseModel {
    return { id: entity.id, code: entity.code, /* … */ };
  }
}

// module
providers: [{ provide: IOrderPresenter, useClass: OrderPresenter }]

// consumer
constructor(private orderPresenter: IOrderPresenter) {}
```

## Constructor grouping

Group dependencies with comment banners. This makes 8+ dependency constructors readable:

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

  /// //////////////////////////
  //  Providers
  /// //////////////////////////
  private uploadProvider: TUploadProvider,

  public logger: ILogger,
) {}
```
