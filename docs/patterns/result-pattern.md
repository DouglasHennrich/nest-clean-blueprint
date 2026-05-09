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
async execute(dto, context?): Promise<Result<IOrderModel>> {
  const order = await this.ordersRepository.findById(dto.id);
  if (!order) return Result.fail(new OrderNotFoundException(dto.id, context));
  return Result.success(order);
}
```

## Controller boundary

Controllers are the ONLY place that converts `Result.fail` into thrown exceptions:

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

## Anti-patterns

```typescript
// ❌ Service throws
async execute() { throw new NotFoundException(); }

// ❌ Service uses presenter
async execute(): Promise<Result<TOrderResponse>> {
  return Result.success(this.presenter.present(order));
}

// ❌ Controller forgets to attach context
const result = await this.service.execute(dto);
if (result.error) throw result.error; // missing context attach
```
