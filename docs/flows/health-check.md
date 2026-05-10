# Flow 8 — Health Check (@nestjs/terminus)

A public `/health` endpoint that aggregates four health indicators: database connectivity, RSS memory, heap memory, and disk usage. Returns HTTP 200 when all checks pass and HTTP 503 when any check fails.

## Files

| File | Purpose |
|---|---|
| `src/modules/health/health.module.ts` | Imports `TerminusModule`, registers `HealthController` |
| `src/modules/health/controllers/health.controller.ts` | `GET /health` — executes all health indicators |

## AppModule wiring

```typescript
imports: [HealthModule]
```

## Response format

### HTTP 200 — all healthy

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_rss": { "status": "up" },
    "memory_heap": { "status": "up" },
    "storage": { "status": "up" }
  },
  "error": {},
  "details": { ... }
}
```

### HTTP 503 — one or more checks failed

```json
{
  "status": "error",
  "info": { "database": { "status": "up" }, ... },
  "error": {
    "memory_heap": { "status": "down", "message": "Heap used 600 MB exceeds 512 MB" }
  },
  "details": { ... }
}
```

## Health indicators configured

| Key | Type | Threshold |
|---|---|---|
| `database` | TypeORM ping | 1500 ms timeout |
| `memory_rss` | RSS memory | 1 GB max |
| `memory_heap` | Heap memory | 512 MB max |
| `storage` | Disk usage | 90% threshold, path `/` |

## Controller

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Public()           // exempt from JWT authentication
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 1500 }),
      () => this.memory.checkRSS('memory_rss', { heapUsedThreshold: 1024 * 1024 * 1024 }),
      () => this.memory.checkHeap('memory_heap', { heapUsedThreshold: 512 * 1024 * 1024 }),
      () => this.disk.checkStorage('storage', { thresholdPercent: 0.9, path: '/' }),
    ]);
  }
}
```

## Skipped paths

`RequestLoggerMiddleware` skips `/health` and `/api/v1/health` so health probe traffic never floods the application logs.

## Extending with custom indicators

```typescript
// 1. Implement HealthIndicator
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();
      return this.getStatus(key, true);
    } catch {
      return this.getStatus(key, false, { message: 'Redis unreachable' });
    }
  }
}

// 2. Register in HealthModule providers[]
// 3. Inject into HealthController and add to health.check([...])
```

## Integration with load balancers

Most load balancers (ALB, nginx) poll `GET /health` every 10-30 seconds. Configure:
- **Healthy threshold**: 2 consecutive 200 responses
- **Unhealthy threshold**: 3 consecutive 503 responses
- **Timeout**: 5 seconds

The route is `@Public()` — no Authorization header required. The `RequestLoggerMiddleware` skips it to prevent log noise from constant probing.

## Anti-patterns

```typescript
// ❌ Don't protect /health with JWT — load balancers don't send tokens
// Missing @Public() → JWT guard rejects the probe → instance marked unhealthy

// ❌ Don't set disk threshold to 1.0 (100%) — you'll never get a warning
() => this.disk.checkStorage('storage', { thresholdPercent: 1.0 })

// ❌ Don't set heapUsedThreshold too low — cold start allocations will trip it
() => this.memory.checkHeap('memory_heap', { heapUsedThreshold: 50 * 1024 * 1024 })
```
