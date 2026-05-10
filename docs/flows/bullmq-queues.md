# Flow 3 — Queues (BullMQ + BullBoard)

Async job processing backed by Redis. `BullMQAdapter` connects to the same Redis used by cache. The Bull Board admin UI is protected by HTTP Basic Auth. Idempotency is enforced by the scheduler before enqueuing.

## Files

| File | Purpose |
|---|---|
| `src/modules/queues/queues.module.ts` | BullMQ root config, queue registration, BullBoard setup |
| `src/modules/queues/dto/example-job.dto.ts` | `IExampleJobData` — typed job payload |
| `src/modules/queues/services/example-scheduler.service.ts` | Enqueues jobs with idempotency check and retry options |
| `src/modules/queues/processors/example.processor.ts` | Consumes jobs from `example-queue` with concurrency=5 |

## Environment variables required

```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=          # optional
REDIS_TLS=false          # set true for TLS connections

BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=<strong-password>
```

## Queue configuration

```typescript
// Connection reused from RedisConnectionHelper (ioredis, maxRetriesPerRequest: null)
BullModule.forRootAsync({
  useFactory: (env: TEnvService) => ({
    connection: RedisConnectionHelper.createBullMQConnection(env),
  }),
})
```

## Adding a new queue

1. Register the queue in `QueuesModule`:
   ```typescript
   BullModule.registerQueue({ name: 'my-new-queue' })
   ```

2. Add the BullBoard feature entry:
   ```typescript
   BullBoardModule.forFeature({ name: 'my-new-queue', adapter: BullMQAdapter })
   ```

3. Create a processor:
   ```typescript
   @Processor('my-new-queue', { concurrency: 3 })
   @Injectable()
   export class MyNewProcessor extends WorkerHost {
     async process(job: Job<IMyJobData>): Promise<void> { ... }
   }
   ```

4. Create a scheduler service (DI token pattern):
   ```typescript
   export abstract class TMySchedulerService { abstract enqueue(...): Promise<Result<void>>; }
   
   @Injectable()
   export class MySchedulerService implements TMySchedulerService { ... }
   ```

5. Register both in `QueuesModule` providers[]:
   ```typescript
   providers: [
     { provide: TMySchedulerService, useClass: MySchedulerService },
     MyNewProcessor,
   ]
   ```

## Idempotency pattern

The scheduler checks for an existing job by ID before adding a new one. The job ID is deterministic — same entity → same ID → deduplication is automatic.

```typescript
const jobId = idempotencyKey ?? `example-${data.entityId}`;

const existing = await this.queue.getJob(jobId);
if (existing) {
  const state = await existing.getState();
  if (['active', 'waiting', 'delayed'].includes(state)) {
    this.logger.warn(`Job ${jobId} already in state ${state} — skipping`);
    return Result.success(undefined);
  }
}

await this.queue.add('process', data, { jobId, attempts: 3, ... });
```

## Job options

```typescript
{
  jobId,                                    // deterministic — enables idempotency
  attempts: 3,                              // retry up to 3 times
  backoff: { type: 'exponential', delay: 2000 }, // 2s → 4s → 8s
  removeOnComplete: 50,                     // keep last 50 completed jobs
  removeOnFail: 100,                        // keep last 100 failed jobs
}
```

## Processor pattern

```typescript
@Processor('example-queue', { concurrency: 5 })
@Injectable()
export class ExampleProcessor extends WorkerHost {
  async process(job: Job<IExampleJobData>): Promise<void> {
    try {
      // do work
    } catch (error) {
      throw error; // re-throw → BullMQ retries based on `attempts`
    }
  }
}
```

Throw `UnrecoverableError` from `bullmq` to permanently fail without retrying:
```typescript
import { UnrecoverableError } from 'bullmq';
throw new UnrecoverableError('Cannot recover — bad data');
```

## Bull Board UI

- **Route**: `GET /admin/queues`
- **Auth**: HTTP Basic (`BULL_BOARD_USERNAME` / `BULL_BOARD_PASSWORD`)
- Shows queue metrics: waiting, active, completed, failed, delayed jobs

## AppModule wiring

```typescript
imports: [QueuesModule]
```

## Anti-patterns

```typescript
// ❌ Don't use Date.now() in jobId — breaks idempotency
const jobId = `job-${entityId}-${Date.now()}`; // different every call!

// ❌ Don't throw inside process() without re-throwing — BullMQ won't retry
async process(job) { try { ... } catch { return; } } // job silently completes as failed

// ❌ Don't share queue names as magic strings — define a constant
this.queue.add('my-queue', data); // name mismatch causes silent failure
```
