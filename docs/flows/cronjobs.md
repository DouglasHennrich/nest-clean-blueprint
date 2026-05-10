# Flow 7 — Cronjobs (@nestjs/schedule)

Scheduled tasks using `@nestjs/schedule`. Each cron service acquires a distributed Redis lock before executing — this prevents double-firing in multi-instance (multi-pod) deployments. The lock is released in a `finally` block to avoid permanent lock leaks on failure.

## Files

| File | Purpose |
|---|---|
| `src/modules/cronjobs/cronjobs.module.ts` | Imports `ScheduleModule.forRoot()` + `CacheModule`, registers all cron services |
| `src/modules/cronjobs/services/cleanup-expired-records-cron.service.ts` | Example cron — runs hourly, acquires Redis lock, executes cleanup |

## AppModule wiring

```typescript
imports: [CronjobsModule]
```

`CronjobsModule` imports `ScheduleModule.forRoot()` internally — do **not** import `ScheduleModule` anywhere else.

## Cron service pattern

```typescript
import { Injectable }       from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CustomLogger, ILogger } from '@/@shared/classes/custom-logger';
import { TDataCacheService }     from '@/@shared/modules/cache/services/data-cache.service';

const LOCK_KEY     = 'cron:lock:my-job';
const LOCK_TTL_SEC = 5 * 60; // must exceed max job duration

@Injectable()
export class MyJobCronService {
  public logger: ILogger = new CustomLogger(MyJobCronService.name);

  constructor(private readonly cacheService: TDataCacheService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleMyJob(): Promise<void> {
    const acquired = await this.acquireLock();
    if (!acquired) {
      this.logger.warn('Lock already held — skipping this run');
      return;
    }

    this.logger.log('Starting job');
    try {
      // TODO: call your domain service here
    } catch (error) {
      this.logger.error(`Job failed: ${(error as Error).message}`);
    } finally {
      await this.releaseLock();
    }
  }

  private async acquireLock(): Promise<boolean> {
    const existing = await this.cacheService.getSimple<string>(LOCK_KEY);
    if (existing) return false;
    await this.cacheService.setSimple(LOCK_KEY, 'locked', LOCK_TTL_SEC);
    return true;
  }

  private async releaseLock(): Promise<void> {
    await this.cacheService.delete(LOCK_KEY);
  }
}
```

## Adding a new cron job

1. Create `src/modules/cronjobs/services/my-job-cron.service.ts` using the pattern above
2. Add `MyJobCronService` to `CronjobsModule.providers[]`
3. Done — no changes to `AppModule` needed

## CronExpression presets

```typescript
CronExpression.EVERY_MINUTE           // '* * * * *'
CronExpression.EVERY_5_MINUTES        // '*/5 * * * *'
CronExpression.EVERY_10_MINUTES       // '*/10 * * * *'
CronExpression.EVERY_30_MINUTES       // '*/30 * * * *'
CronExpression.EVERY_HOUR             // '0 * * * *'
CronExpression.EVERY_DAY_AT_MIDNIGHT  // '0 0 * * *'
CronExpression.EVERY_WEEK             // '0 0 * * 0'
```

Custom cron expression (every day at 3 AM UTC):
```typescript
@Cron('0 3 * * *')
```

## Distributed lock considerations

The lock uses a get-then-set pattern:

```
getSimple(LOCK_KEY)   ← if set → skip (another instance is running)
setSimple(LOCK_KEY, 'locked', TTL)
... do work ...
delete(LOCK_KEY)      ← always in finally
```

> **TOCTOU race**: Two instances could both pass the `getSimple` check before either calls `setSimple`. In practice this window is microseconds and acceptable for most cron workloads. For production-critical locks requiring true atomicity, use a native Redis `SET key value NX EX ttl` command via ioredis.

**LOCK_TTL_SEC** must be greater than the longest expected job duration. If the job runs longer than the TTL, the lock expires and another instance may start before the first finishes.

## Anti-patterns

```typescript
// ❌ No distributed lock in multi-instance deployment
@Cron(CronExpression.EVERY_HOUR)
async handle() {
  await this.doExpensiveWork(); // runs on every pod simultaneously
}

// ❌ Lock not released on failure — permanent lock until TTL expires
try {
  await this.releaseLock(); // only on success path
  await doWork();
} catch { /* lock never released */ }

// ❌ LOCK_TTL_SEC shorter than job duration — double-firing
const LOCK_TTL_SEC = 10; // job takes 5 minutes → lock expires → second instance starts
```
