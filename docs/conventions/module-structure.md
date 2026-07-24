# Module structure

Every domain module mirrors the same layout. The exact folders are mandatory — even when empty initially — so contributors find code in predictable places. `src/modules/_example_orders/` is the canonical, fully wired reference instance — copy its shape rather than inventing a new one.

```
orders/
├── controllers/         one file per HTTP action
│   ├── create-order.controller.ts
│   ├── get-order.controller.ts
│   ├── list-orders.controller.ts
│   ├── update-order.controller.ts
│   └── delete-order.controller.ts
├── dto/                 one Zod schema + inferred type PER ACTION, each with a .spec.ts
│   ├── create-order.dto.ts
│   ├── get-order.dto.ts
│   ├── list-orders.dto.ts
│   ├── update-order.dto.ts
│   └── delete-order.dto.ts
├── entities/            TypeORM @Entity classes, extend BaseEntity
│   └── order.entity.ts
├── enums/
│   └── order-status.enum.ts
├── errors/              ONE exception class PER FILE, extending AbstractApplicationException
│   ├── order-not-found.exception.ts
│   └── order-already-cancelled.exception.ts
├── models/              I<Entity>Model interfaces — file named `[entity].struct.ts` (not `.model.ts`)
│   └── order.struct.ts
├── presenters/          response shape transformers — abstract token + useClass, no @Injectable
│   └── order.presenter.ts
├── repositories/        abstract token extends AbstractRepository<Entity, Model>
│   └── orders.repository.ts
├── services/            one class per action
│   ├── create-order.service.ts
│   ├── get-order.service.ts
│   ├── list-orders.service.ts
│   ├── update-order.service.ts
│   └── delete-order.service.ts
└── orders.module.ts     wires entities, repositories, presenters, services, controllers
```

## Module file template

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity]), EnvModule],
  controllers: [
    CreateOrderController,
    GetOrderController,
    ListOrdersController,
    UpdateOrderController,
    DeleteOrderController,
  ],
  providers: [
    { provide: IOrdersRepository, useClass: OrdersRepository },
    { provide: IOrderPresenter, useClass: OrderPresenter },
    { provide: TCreateOrderService, useClass: CreateOrderService },
    { provide: TGetOrderService, useClass: GetOrderService },
    { provide: TListOrdersService, useClass: ListOrdersService },
    { provide: TUpdateOrderService, useClass: UpdateOrderService },
    { provide: TDeleteOrderService, useClass: DeleteOrderService },
  ],
})
export class OrdersModule {}
```

Order matters for readability: imports → controllers → providers (repository, presenter, services in CRUD order).

## When to share — and when NOT to share

- **Share:** the model interface, the entity (if another module needs to relate via FK), the repository token (if another module needs to query).
- **Do NOT share:** services and presenters across modules. If module B needs module A's logic, A emits an event and B listens. This keeps modules cohesive.
