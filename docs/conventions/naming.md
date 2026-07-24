# Naming conventions

| Element | Pattern | Example |
|---|---|---|
| File — service | `[action]-[entity].service.ts` | `create-order.service.ts` |
| File — controller | `[action]-[entity].controller.ts` | `create-order.controller.ts` |
| File — entity | `[entity].entity.ts` | `order.entity.ts` |
| File — repository | `[entities-plural].repository.ts` | `orders.repository.ts` |
| File — model | `[entity].struct.ts` | `order.struct.ts` |
| File — presenter | `[entity].presenter.ts` | `order.presenter.ts` |
| File — DTO (one per action) | `[action]-[entity].dto.ts` | `create-order.dto.ts` |
| File — exception (one class per file) | `[reason].exception.ts` | `order-not-found.exception.ts` |
| File — enum | `[entity]-[aspect].enum.ts` | `order-status.enum.ts` |
| File — module | `[entities-plural].module.ts` | `orders.module.ts` |
| Abstract DI token (service) | `T[Action][Entity]Service` | `TCreateOrderService` |
| Abstract DI token (repository) | `I[EntitiesPlural]Repository` | `IOrdersRepository` |
| Abstract DI token (presenter) | `I[Entity]Presenter` | `IOrderPresenter` |
| Model interface | `I[Entity]Model` | `IOrderModel` |
| Concrete service class | `[Action][Entity]Service` | `CreateOrderService` |
| Concrete controller class | `[Action][Entity]Controller` | `CreateOrderController` |
| Concrete repository class | `[EntitiesPlural]Repository` | `OrdersRepository` |
| Concrete presenter class | `[Entity]Presenter` | `OrderPresenter` |
| Custom exception class | `[Reason]Exception` | `OrderNotFoundException`, `OrderAlreadyCancelledException` |
| Zod schema | `[action][Entity]DtoSchema` | `createOrderDtoSchema` |
| Zod inferred type | `T[Action][Entity]Dto` | `TCreateOrderDto` |
| Enum | `[Entity][Aspect]Enum` | `OrderStatusEnum` |
| Event constant | `UPPER_SNAKE_CASE` | `ORDER_CREATED` |
| Event class | `[Entity][Action]Event` | `OrderCreatedEvent` |

Every model interface is suffixed `Model` (`I...Model`); every DTO inferred type is prefixed
`T...`; every enum is suffixed `Enum`. These three suffixes/prefixes are non-negotiable —
they're what makes bare `grep`-based reviews reliable across the codebase.

Each DTO file holds exactly one action's schema + inferred type (`create-order.dto.ts`,
`get-order.dto.ts`, `list-orders.dto.ts`, ...), each with a matching `.spec.ts`. Each custom
exception gets its own file under `errors/` — never group multiple exception classes in one
`[entity].errors.ts` file. `DefaultException` (defined alongside
`AbstractApplicationException` in `src/@shared/errors/abstract-application-exception.ts`) is
the only generic/shared exception; every domain-specific error gets a dedicated file.

## Database tables and columns

- Table names: `snake_case`, plural (`orders`, `order_items`).
- Column names: `snake_case` (`customer_name`, `created_at`, `deleted_at`).
- Map to entity properties via `@Column({ name: 'customer_name' })`.
- Enum columns are stored as `varchar` (NEVER as Postgres native enums).
- Standard timestamp columns: `created_at`, `updated_at`, `deleted_at` (soft delete).
