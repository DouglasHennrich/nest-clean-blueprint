# Result pattern

Services return `Result<T>` instead of throwing. Only controllers throw. This enforces explicit error handling at every layer and keeps stack traces meaningful.

## Why

- **No surprise throws.** A service signature reads as a complete contract: success type and failure paths are both visible.
- **Composable.** A service that calls another service propagates failure with a single line: `if (inner.error) return Result.fail(inner.error);`.
- **Testable.** No try/catch around assertions — check `result.error` instance directly.

## API

```typescript
Result.success<T>(value?: T): Result<T>
Result.fail<T>(error: AbstractApplicationException | Error): Result<T>

result.error          // undefined when success
result.getValue()     // T | null
```

## Example

```typescript
async execute(dto: TGetOrderDto): Promise<Result<IOrderModel>> {
  const order = await this.ordersRepository.findById({ id: dto.id });
  if (!order) return Result.fail(new OrderNotFoundException(dto.id));
  return Result.success(order);
}
```

Note there is no `context` parameter anywhere in this chain. `AbstractApplicationException`
reads `RequestContext.getContext()` itself in its constructor (see
[docs/patterns/request-context.md](./request-context.md)) — services and exceptions never
receive or forward context explicitly.

## Controller boundary

Controllers are the ONLY place that converts `Result.fail` into thrown exceptions — and the
only layer that calls the presenter:

```typescript
const result = await this.getOrderService.execute(dto);
if (result.error) {
  throw result.error;
}
return this.orderPresenter.present({ entity: result.getValue()! });
```

## Anti-patterns

```typescript
// ❌ Service throws
async execute() { throw new NotFoundException(); }

// ❌ Service uses presenter
async execute(): Promise<Result<IOrderPresenterResponseModel>> {
  return Result.success(this.presenter.present({ entity: order }));
}

// ❌ Passing context explicitly — RequestContext is read internally
async execute(dto, context) { /* … */ }
```
