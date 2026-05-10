# Flow 5 — Logger

Structured, correlated logging via `CustomLogger` (extends NestJS `ConsoleLogger`). Every log line is automatically tagged with the request's correlation ID (UUID) from `AsyncContext`. `RequestLoggerMiddleware` logs all mutating HTTP requests with duration.

## Files

| File | Purpose |
|---|---|
| `src/@shared/modules/logger/logger.module.ts` | Global `@Module` — provides `{ provide: ILogger, useClass: CustomLogger }` |
| `src/@shared/classes/custom-logger.ts` | `ILogger` abstract class + `CustomLogger` implementation (Scope.TRANSIENT) |
| `src/@shared/classes/async-context.ts` | `AsyncContext` — `AsyncLocalStorage` wrapper that carries `requestId`, `userId`, `userTimezone` |
| `src/@shared/middlewares/request-id.middleware.ts` | Generates a UUID and seeds `AsyncContext` — must be registered FIRST |
| `src/@shared/middlewares/request-logger.middleware.ts` | Logs `Incoming Request` + `Response` with duration for configured HTTP methods |

## AppModule wiring

```typescript
imports: [
  LoggerModule,  // FIRST — other modules that log depend on ILogger
  CacheModule,
  ...
]

configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(RequestIdMiddleware)       // seeds AsyncContext — must be first middleware
    .forRoutes('*')
    .apply(RequestLoggerMiddleware)   // logs after request ID is set
    .forRoutes('*');
}
```

## ILogger API

```typescript
abstract class ILogger {
  abstract setContextName(name: string): void;
  abstract log(message: string, context?: unknown): void;
  abstract warn(message: string, context?: unknown): void;
  abstract error(message: string, context?: unknown): void;
  abstract debug(message: string, context?: unknown): void;
}
```

## Using ILogger in a service

```typescript
import { ILogger } from '@/@shared/classes/custom-logger';

@Injectable()
export class MyService {
  // public — required for NestJS to inject into the global filter
  public logger: ILogger = new CustomLogger(MyService.name);

  constructor() {
    this.logger.setContextName(MyService.name);
  }

  async doWork() {
    this.logger.log('Starting work');
    this.logger.debug('Detailed info', { key: 'value' });
    this.logger.warn('Something unexpected', { reason });
    this.logger.error('Critical failure', { error: err.message });
  }
}
```

Alternatively, inject via DI (the ILogger provided by LoggerModule is `Scope.TRANSIENT`):

```typescript
constructor(private readonly logger: ILogger) {
  this.logger.setContextName(MyService.name);
}
```

## Correlation ID

Every log line emitted through `CustomLogger` includes the current request's `requestId` automatically — no need to pass it manually.

`RequestIdMiddleware` → `AsyncContext.run({ requestId: uuid })` → `CustomLogger.formatMessage()` reads `AsyncContext.getRequestId()`.

Reading the ID manually (e.g., in a filter):
```typescript
const logId = AsyncContext.getRequestId() ?? req.requestId ?? 'no-id';
```

## RequestLoggerMiddleware

Logs all `GET | POST | PUT | PATCH | DELETE` requests. Skips:
- `/` (root)
- `/health` and `/api/v1/health`
- `/metrics`
- `/favicon.ico`

Log format:
```
DEBUG [RequestLoggerMiddleware] Incoming Request: POST /api/v1/orders
DEBUG [RequestLoggerMiddleware] Response: POST /api/v1/orders - Status: 201 - Duration: 42ms
```

## AllExceptionsFilter integration

The global filter (`AllExceptionsFilter`) injects `ILogger` at bootstrap:

```typescript
// src/main.ts
const logger = app.get(ILogger);
app.useGlobalFilters(new AllExceptionsFilter(logger));
```

The filter logs 5xx errors at `error` level and 4xx at `warn` level with the `logId` included.

## Anti-patterns

```typescript
// ❌ Never use console.log in production code
console.log('done'); // no correlation ID, no level, no context name

// ❌ Don't call setContextName with a hardcoded string that mismatches the class
this.logger.setContextName('WrongName'); // misleading logs

// ❌ Don't register RequestLoggerMiddleware before RequestIdMiddleware
// The correlation ID won't be set yet and logs will show 'no-id'
consumer.apply(RequestLoggerMiddleware, RequestIdMiddleware).forRoutes('*'); // wrong order
```
