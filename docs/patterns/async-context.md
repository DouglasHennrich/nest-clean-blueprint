# AsyncContext (Correlation ID propagation)

Per-request data (Correlation ID, userId, timezone) is propagated through the entire async call chain via `AsyncLocalStorage` — without passing it as a parameter to every method.

## Lifecycle

1. `RequestIdMiddleware` runs first on every HTTP request.
2. It generates a UUID (or reuses `x-request-id` header).
3. It calls `AsyncContext.run({ requestId, userTimezone }, () => next())`.
4. Every downstream service / repository / log can read it via `AsyncContext.getRequestId()`.
5. The same UUID is exposed as `X-Request-ID` response header for clients to log.

## API

```typescript
AsyncContext.getRequestId(): string | undefined
AsyncContext.getUserId():    string | undefined
AsyncContext.getUserTimezone(): string | undefined

AsyncContext.set('key', value)
AsyncContext.get('key')

AsyncContext.run(context, fn)  // seed (only middleware should call this)
```

## Used by `CustomLogger`

Every log line is automatically tagged with the Correlation ID:

```
[CreateOrderService][b1cb6536-…] Creating order for John Doe
```

This means every log entry can be traced back to the originating request — even from background jobs that inherited the context.

## Used by `@ReqContext()`

Controllers receive an `IRequestContext` built from `AsyncContext` + the Express request:

```typescript
async createOrder(@ReqContext() context: IRequestContext, ...) {
  const result = await this.service.execute(dto, context);
  // context.requestId is the same UUID seeded by the middleware
}
```

## Important

- **Only middleware should call `AsyncContext.run`.** Application code reads, never seeds.
- **Background jobs need to manually seed context.** When you spawn work outside an HTTP request (cron, queue), wrap the handler with `AsyncContext.run({ requestId: uuidv4() }, async () => await handler())`.
