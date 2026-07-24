# RequestContext (Correlation ID propagation)

Per-request data (Correlation ID, userId, timezone, ip, userAgent, ...) is propagated through the entire async call chain via Node's `AsyncLocalStorage` — without passing it as a parameter to every method.

See `src/@shared/context/request.context.ts` for the implementation. There is no tenant/multi-tenant concept here — `RequestContext` carries purely per-request correlation data.

## Model

```typescript
export interface IRequestContextModel {
  requestId: string;
  userId?: string;
  userTimezone?: string;
  ip?: string;
  userAgent?: string;
  startedAt: Date;
  method?: string;
  path?: string;
  query?: Record<string, any>;
  body?: Record<string, any>;
  params?: Record<string, any>;
  [key: string]: any;
}
```

## Lifecycle

1. `RequestContextMiddleware` runs first on every HTTP request.
2. It generates a `requestId` (UUID, or reuses an incoming `x-request-id` header) and calls `RequestContext.run({ requestId, startedAt, ... }, () => next())`.
3. Every downstream service / repository / exception / log can read it via `RequestContext.getContext()` (or the typed getters below) — no need to thread it through method parameters.
4. `@ReqContext()` enriches the context with request-scoped data (ip, userAgent, ...) inside controllers.

## API

```typescript
RequestContext.run<T>(context: IRequestContextModel, fn: () => T): T   // seed (only middleware should call this)

RequestContext.getContext(): IRequestContextModel | undefined
RequestContext.getRequestId(): string | undefined
RequestContext.getUserId(): string | undefined
RequestContext.getUserTimezone(): string | undefined

RequestContext.set(key: string, value: any): void
RequestContext.get(key: string): any
```

## Used by `CustomLogger`

Every log line is automatically tagged with the Correlation ID by reading `RequestContext.getRequestId()` internally:

```
[CreateOrderService][b1cb6536-…] Creating order for John Doe
```

This means every log entry can be traced back to the originating request — even from background jobs that inherited the context.

## Used by `AbstractApplicationException`

`src/@shared/errors/abstract-application-exception.ts` reads `RequestContext.getContext()` itself in its constructor — application code never passes `context` through exception constructors or service signatures:

```typescript
export abstract class AbstractApplicationException extends Error {
  public statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
  public context?: IRequestContextModel;

  constructor(message: string, name?: string, statusCode?: number) {
    super(message);
    this.name = name || 'AbstractApplicationException';
    this.statusCode = statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    this.context = RequestContext.getContext();
  }
}
```

## Important

- **Only middleware should call `RequestContext.run`.** Application code reads, never seeds.
- **Background jobs need to manually seed context.** When you spawn work outside an HTTP request (cron, queue), wrap the handler with `RequestContext.run({ requestId: uuidv4(), startedAt: new Date() }, async () => await handler())`.
- **Never pass context as a method parameter.** Services, repositories and exceptions all call `RequestContext.getContext()` (or the typed getters) directly wherever it's needed.
