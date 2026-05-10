# Flow 4 — Cache (Redis + cache-manager)

Application-level caching via `cache-manager` + `@keyv/redis`. A global `CacheModule` provides `TDataCacheService` to any module in the application. All Redis operations degrade gracefully — a cache miss or Redis failure never breaks the request.

## Files

| File | Purpose |
|---|---|
| `src/@shared/modules/cache/cache.module.ts` | Global `@Module` — registers `NestCacheModule` with Keyv/Redis and provides `TDataCacheService` |
| `src/@shared/modules/cache/services/data-cache.service.ts` | `TDataCacheService` (DI token) + `DataCacheService` implementation |
| `src/@shared/modules/cache/models/cache.struct.ts` | `TAbstractCache` abstract class, `ICacheOptions`, `DEFAULT_CACHE_OPTIONS` |
| `src/@shared/helpers/redis-connection.helper.ts` | `RedisConnectionHelper.createCacheRedisUrl()` — builds Redis URL for cache-manager |

## Environment variables required

```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=          # optional
REDIS_TLS=false
```

## AppModule wiring

```typescript
imports: [
  LoggerModule,   // first
  CacheModule,    // second — global, available everywhere after this
  ...
]
```

`CacheModule` is `@Global()` — import it once in `AppModule`. Do **not** re-import it in feature modules.

## TDataCacheService API

```typescript
// Cache-aside: fetch from Redis, call fetchFn on miss, store result
get<T>(key: string, fetchFn: () => Promise<T>, options?: ICacheOptions): Promise<T>

// Store a value
set<T>(key: string, value: T, options?: ICacheOptions): Promise<void>

// Read without fetch fallback (returns null on miss)
getSimple<T>(key: string): Promise<T | null>

// Store without options object (raw TTL in seconds)
setSimple<T>(key: string, value: T, ttlSeconds?: number): Promise<void>

// Delete a single key
delete(key: string): Promise<void>

// Clear entire cache namespace
clear(): Promise<void>
```

## ICacheOptions

```typescript
interface ICacheOptions {
  ttl?: number;           // TTL in seconds (default: from DEFAULT_CACHE_OPTIONS)
  shouldExpire?: boolean; // false = store forever (default: true)
}
```

## Cache-aside pattern (recommended)

```typescript
constructor(private readonly cacheService: TDataCacheService) {}

async findById(id: string): Promise<IOrderModel | null> {
  return this.cacheService.get(
    `order:${id}`,
    () => this.ordersRepository.findById(id), // called only on cache miss
    { ttl: 300 },                              // 5 minutes
  );
}
```

On a hit: returns the cached value immediately.
On a miss: calls the lambda, stores the result, returns it.
On Redis failure: calls the lambda and returns its result (graceful degradation — no exception propagated).

## Simple read/write

```typescript
// Write
await this.cacheService.setSimple('feature:flag:payments', true, 60); // 60s TTL

// Read
const enabled = await this.cacheService.getSimple<boolean>('feature:flag:payments');
if (enabled === null) { /* cache miss */ }
```

## Distributed lock pattern

Used by CronjobsModule to prevent double-firing in multi-instance deployments:

```typescript
const LOCK_KEY = 'cron:lock:my-job';
const LOCK_TTL_SECONDS = 300; // max job duration

const existing = await this.cacheService.getSimple<string>(LOCK_KEY);
if (existing) return; // already running on another instance

await this.cacheService.setSimple(LOCK_KEY, 'locked', LOCK_TTL_SECONDS);
try {
  // do work
} finally {
  await this.cacheService.delete(LOCK_KEY);
}
```

> **Note**: The get-then-set pattern has a narrow TOCTOU race in high-throughput scenarios. For production-critical locks, use a native Redis `SET NX EX` command via ioredis directly.

## Injecting TDataCacheService

```typescript
constructor(private readonly cacheService: TDataCacheService) {}
```

`TDataCacheService` is provided by the global `CacheModule` — no need to import `CacheModule` in the consuming module.

## Anti-patterns

```typescript
// ❌ Don't import CacheModule in feature modules — it's global
@Module({ imports: [CacheModule] }) // redundant import
export class OrdersModule {}

// ❌ Don't let cache failures propagate — degrade gracefully
const cached = await redisClient.get(key); // raw ioredis — no error handling
return cached; // throws if Redis is down

// ❌ Don't use TTL in milliseconds with setSimple — it expects seconds
await this.cacheService.setSimple('key', value, 5 * 60 * 1000); // wrong — 5000 minutes!
await this.cacheService.setSimple('key', value, 5 * 60);         // correct — 300 seconds
```
