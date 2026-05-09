# Pagination

All list services MUST return `IPagination<T>` and use `TEnvService` to source the default page size.

## Contract

```typescript
export interface IPagination<T> {
  hasNextPage: boolean;
  total?: number;
  data: T[];
}
```

## Service

```typescript
export abstract class TListOrdersService extends AbstractService<
  TListOrdersDtoServiceSchema,
  IPagination<IOrderModel>
> {}

@Injectable()
export class ListOrdersService implements TListOrdersService {
  constructor(
    private envService: TEnvService,           // ← required
    private ordersRepository: IOrdersRepository,
  ) {}

  async execute({
    page = 1,
    offset = this.envService.get('UTILITIES_PAGINATION_LIMIT'),
    status,
  }: TListOrdersDtoServiceSchema): Promise<Result<IPagination<IOrderModel>>> {
    return Result.success(
      await this.ordersRepository.find({ where: { status }, page, offset }),
    );
  }
}
```

## Controller response

Wrap presenter output around the pagination shape:

```typescript
const page = result.getValue()!;
return {
  data: this.orderPresenter.presentMany(page.data),
  hasNextPage: page.hasNextPage,
  total: page.total,
};
```

## Query DTO

```typescript
export const listOrdersDtoQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(OrderStatusEnum).optional(),
});
```

`z.coerce.number()` handles the `?page=2` string → number conversion automatically.
