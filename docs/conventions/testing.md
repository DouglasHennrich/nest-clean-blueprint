# Testing conventions

## File layout

- Unit tests: `*.spec.ts`, co-located with the source OR under `tests/modules/...`.
- E2E tests: `*.spec.e2e.ts`, under `tests/e2e/`.
- Factories: `tests/factories/`.
- Stubs / mocks: `tests/stubs/`.

## Run

```bash
pnpm test:unit            # *.spec.ts
pnpm test:e2e             # *.spec.e2e.ts
pnpm test:cov             # with coverage
pnpm jest path/to.spec.ts # single file
pnpm jest -t 'name'       # single test by name
```

## Assert errors by class instance

```typescript
// ✅ class instance
expect(result.error).toBeInstanceOf(OrderNotFoundException);

// ❌ message contents — brittle, breaks on i18n
expect(result.error?.message).toContain('not found');
```

## Use factories — never hand-build test data

```typescript
import { makeOrder } from 'tests/factories/order.factory';

const order = makeOrder({ status: OrderStatusEnum.PENDING });
```

A factory is a function that returns a fully-valid model with sensible defaults, accepting overrides.

## Mock services via the abstract token

```typescript
const mockCreateOrderService = {
  execute: jest.fn().mockResolvedValue(Result.success(makeOrder())),
};

await Test.createTestingModule({
  providers: [
    { provide: TCreateOrderService, useValue: mockCreateOrderService },
  ],
}).compile();
```

## Service unit test template

```typescript
describe('CreateOrderService', () => {
  let service: CreateOrderService;
  let repo: jest.Mocked<IOrdersRepository>;

  beforeEach(async () => {
    repo = { create: jest.fn() } as any;
    const module = await Test.createTestingModule({
      providers: [
        CreateOrderService,
        { provide: IOrdersRepository, useValue: repo },
      ],
    }).compile();
    service = module.get(CreateOrderService);
  });

  it('returns Result.success with the created order', async () => {
    const order = makeOrder();
    repo.create.mockResolvedValue(order);

    const result = await service.execute({ customerName: 'A', amount: 10 });

    expect(result.error).toBeUndefined();
    expect(result.getValue()).toEqual(order);
  });
});
```

## E2E template

```typescript
describe('POST /api/v1/orders', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('creates an order', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({ customerName: 'Jane', amount: 99.9 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ customerName: 'Jane' });
  });
});
```
