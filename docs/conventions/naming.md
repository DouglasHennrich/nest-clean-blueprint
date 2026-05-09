# Naming conventions

| Element | Pattern | Example |
|---|---|---|
| File — service | `[action]-[entity].service.ts` | `create-order.service.ts` |
| File — controller | `[action]-[entity].controller.ts` | `create-order.controller.ts` |
| File — entity | `[entity].entity.ts` | `order.entity.ts` |
| File — repository | `[entities-plural].repository.ts` | `orders.repository.ts` |
| File — model | `[entity].model.ts` | `order.model.ts` |
| File — presenter | `[entity].presenter.ts` | `order.presenter.ts` |
| File — DTO | `[entity].dto.ts` | `order.dto.ts` |
| File — exception | `[entity].errors.ts` | `order.errors.ts` |
| File — module | `[entities-plural].module.ts` | `orders.module.ts` |
| Abstract DI token (service) | `T[Action][Entity]Service` | `TCreateOrderService` |
| Abstract DI token (repository) | `I[EntitiesPlural]Repository` | `IOrdersRepository` |
| Abstract DI token (presenter) | `I[Entity]Presenter` | `IOrderPresenter` |
| Model interface | `I[Entity]Model` | `IOrderModel` |
| Concrete service class | `[Action][Entity]Service` | `CreateOrderService` |
| Concrete controller class | `[Action][Entity]Controller` | `CreateOrderController` |
| Concrete repository class | `[EntitiesPlural]Repository` | `OrdersRepository` |
| Concrete presenter class | `[Entity]Presenter` | `OrderPresenter` |
| Custom exception | `[Entity][Reason]Exception` | `OrderNotFoundException` |
| Zod schema | `[action][Entity]Dto[Type]Schema` | `createOrderDtoBodySchema` |
| Zod inferred type | `T[Action][Entity]Dto[Type]Schema` | `TCreateOrderDtoBodySchema` |
| Enum | `[Entity][Aspect]Enum` | `OrderStatusEnum` |
| Event constant | `UPPER_SNAKE_CASE` | `ORDER_CREATED` |
| Event class | `[Entity][Action]Event` | `OrderCreatedEvent` |

DTO `Type` ∈ `Body` · `Query` · `Param` · `Service` · `Response`.

## Database tables and columns

- Table names: `snake_case`, plural (`orders`, `order_items`).
- Column names: `snake_case` (`customer_name`, `created_at`, `deleted_at`).
- Map to entity properties via `@Column({ name: 'customer_name' })`.
- Enum columns are stored as `varchar` (NEVER as Postgres native enums).
- Standard timestamp columns: `created_at`, `updated_at`, `deleted_at` (soft delete).
