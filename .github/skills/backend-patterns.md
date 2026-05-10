---
name: backend-patterns
description: "REQUIRED for any NestJS backend code. ALWAYS load before: creating a service, writing a controller, adding a repository, building a module, creating an entity, adding a presenter, writing a DTO, implementing a feature, modifying existing service/controller/repository/entity/presenter/DTO/module. Covers Result<T> pattern, DI tokens (TService/IRepository), AbstractService, Zod DTOs, constructor injection format (public logger / private readonly), validateDto, and modular file structure conventions."
---

# Backend Patterns — NestJS

Patterns and conventions for this NestJS + TypeORM + PostgreSQL + Redis + BullMQ backend.

## When to Activate

- Creating or extending a module (Models → Entities → Repositories → Services → Controllers → Presenters)
- Implementing service layer logic with `Result<T>`
- Adding caching with Redis or queue jobs with BullMQ
- Reviewing or refactoring controller/service code

---

## Architecture Flow

```
Models (.struct.ts) → Entities (.entity.ts) → Repositories (.repository.ts)
  → Services (.service.ts) → Controllers (.controller.ts) → Presenters (.presenter.ts)
```

### File naming

```
modules/[feature]/
├── models/[name].struct.ts
├── entities/[name].entity.ts
├── repositories/[name-plural].repository.ts
├── services/[action]-[name].service.ts
├── controllers/[action]-[name].controller.ts
├── presenters/[name].presenter.ts
├── dto/[action]-[name].dto.ts
├── docs/[action]-[name].doc.ts
├── errors/[name]-not-found.exception.ts
└── [name-plural].module.ts
```

---

## Result Pattern

All services return `Result<T>`. Never throw inside a service — wrap errors.

```typescript
// Service method signature
async execute(dto: TMyDtoSchema): Promise<Result<IMyModel>> {
  const validation = await this.validateDto(dto);
  if (validation.error) return Result.fail(validation.error);

  const entity = await this.repository.create(validation.getValue()!);
  return Result.success(entity);
}

// Controller consuming the result
const result = await this.myService.execute(dto);
if (result.error) throw result.error;
return MyPresenter.toHTTP(result.getValue()!);
```

---

## Dependency Injection Pattern

```typescript
@Injectable()
export class CreateMyEntityService implements TCreateMyEntityService {
  constructor(
    /// Repositories
    private readonly myEntityRepository: IMyEntityRepository,

    /// Services
    private readonly otherService: TOtherService,

    /// Providers
    public logger: ILogger,
  ) {
    this.logger.setContextName(CreateMyEntityService.name);
  }
}
```

---

## Entity Pattern

```typescript
@Entity('my-entities')
export class MyEntity implements IMyEntityModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  // Relations use Model interfaces, not Entity classes
  @ManyToOne(() => OtherEntity)
  @JoinColumn({ name: 'other_entity_id' })
  otherEntity?: IOtherModel;

  @Column({ name: 'other_entity_id' })
  @Index()
  otherEntityId: string;
}
```

**Rules:**
- Always add `@Index()` on FK columns
- Use `@Index()` decorator + `CREATE INDEX` in migration
- Relations reference `I[Name]Model` interfaces, not entity classes

---

## Repository Pattern

```typescript
export abstract class IMyEntitiesRepository {
  abstract create(data: Omit<IMyEntityModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<IMyEntityModel>;
  abstract findById(id: string): Promise<IMyEntityModel | null>;
  abstract list(filters: TListFilters): Promise<IMyEntityModel[]>;
  abstract update(id: string, data: Partial<IMyEntityModel>): Promise<IMyEntityModel>;
  abstract delete(id: string): Promise<void>;
}
```

Use TypeORM operators directly — never MongoDB-style:

```typescript
// ✅ CORRECT
import { IsNull, Not, MoreThan, In, Between } from 'typeorm';
await this.repo.findOne({ where: { deletedAt: IsNull(), status: Not('inactive') } });

// ❌ WRONG
await this.repo.findOne({ where: { deletedAt: { $ne: null } } });
```

---

## DTO Validation with Zod

```typescript
import { z } from 'zod';

export const createMyEntityDtoSchema = z.object({
  name: z.string().min(1),
  userId: z.string().uuid(),
});

export type TCreateMyEntityDtoSchema = z.infer<typeof createMyEntityDtoSchema>;
```

---

## Controller Pattern

```typescript
@Controller('my-entities')
export class CreateMyEntityController {
  constructor(private readonly service: TCreateMyEntityService) {}

  @Post()
  @ApiDocumentation(CreateMyEntityDoc)
  async handle(@Body() body: TCreateMyEntityDtoSchema): Promise<MyEntityPresenter> {
    const result = await this.service.execute(body);
    if (result.error) throw result.error;
    return MyEntityPresenter.toHTTP(result.getValue()!);
  }
}
```

---

## Redis Caching

```typescript
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

// Cache with TTL (seconds)
await this.cache.set(`user:${userId}`, data, 300);
const cached = await this.cache.get<IUserModel>(`user:${userId}`);
await this.cache.del(`user:${userId}`);
```

**Distributed lock pattern:**
```typescript
const lockKey = `my-lock-${entityId}`;
const lock = await this.distributedLockService.acquireLock(lockKey, { ttl: 30 });
if (!lock) return Result.fail(new Error('Already processing'));

try {
  // ... critical section ...
} finally {
  await this.distributedLockService.releaseLock(lockKey, lock);
}
```

---

## BullMQ Queues

```typescript
// Producer — inject the queue
@InjectQueue('my-queue') private queue: Queue

await this.queue.add('job-name', { entityId }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

// Consumer
@Processor('my-queue')
export class MyQueueProcessor {
  @Process('job-name')
  async handle(job: Job<{ entityId: string }>) {
    // process...
  }
}
```

---

## Error Handling

- Create typed exceptions: `MyEntityNotFoundException extends NotFoundException`
- Exceptions are thrown from controllers, not services
- Services return `Result.fail(new MyException(...))` — controllers re-throw

```typescript
export class MyEntityNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`MyEntity ${id} not found`);
  }
}
```

---

## Logging

```typescript
this.logger.log(`Creating entity: ${JSON.stringify(dto)}`, context);
this.logger.warn(`Failed: ${error.message}`, context);
this.logger.error(`Unexpected error: ${error.message}`, context);
```

Never log sensitive fields (passwords, tokens, base64 file content).

---

## Date Handling

```typescript
// Always use date-fns, never native Date methods
import { isAfter, addHours, formatISO } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

const expiry = addHours(new Date(), 24);
const isExpired = isAfter(new Date(), expiry);
```
