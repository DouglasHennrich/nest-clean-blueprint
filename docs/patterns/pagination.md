# Pagination

All list services MUST return `IPaginationModel<T>` (from `@/@shared/classes/repository`) and rely on `AbstractRepository.find(...)` to source the default page size via `TEnvService`.

## Contract

```typescript
export interface IPaginationModel<T> {
  hasNextPage: boolean;
  total?: number;
  data: T[];
}
```

`AbstractRepository` reads the default page size itself in its constructor
(`this.defaultPaginationLimit = this.envService.get('UTILITIES_PAGINATION_LIMIT')`), so
services only need to forward `page`/`offset` through to `repository.find(...)`.

## Service

```typescript
export abstract class TListOrdersService extends AbstractService<
  TListOrdersDto,
  IPaginationModel<IOrderModel>
> {}

@Injectable()
export class ListOrdersService implements TListOrdersService {
  constructor(
    /// //////////////////////////
    //  Repositories
    /// //////////////////////////
    private ordersRepository: IOrdersRepository,

    /// //////////////////////////
    //  Providers
    /// //////////////////////////
    public logger: ILogger,
  ) {
    this.logger.setContextName(ListOrdersService.name);
  }

  async execute(dto: TListOrdersDto): Promise<Result<IPaginationModel<IOrderModel>>> {
    const invalid = AbstractService.validateDto(listOrdersDtoSchema, dto);
    if (invalid) return Result.fail(invalid.error!);

    const { page, offset, status } = dto;
    const where = status ? { status } : undefined;

    const result = await this.ordersRepository.find({
      where,
      page,
      offset,
      order: { createdAt: 'DESC' } as any,
    });

    return Result.success(result);
  }
}
```

## Controller response

Wrap presenter output around the pagination shape. The controller is the ONLY layer that
calls the presenter:

```typescript
const result = await this.listOrdersService.execute(query);
if (result.error) throw result.error;

const page = result.getValue()!;
return {
  data: this.orderPresenter.presentMany({ entities: page.data }),
  hasNextPage: page.hasNextPage,
  total: page.total,
};
```

## Query DTO

```typescript
export const listOrdersDtoSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(OrderStatusEnum).optional(),
});

export type TListOrdersDto = z.infer<typeof listOrdersDtoSchema>;
```

`z.coerce.number()` handles the `?page=2` string → number conversion automatically.

See `src/modules/_example_orders/services/list-orders.service.ts` and
`src/modules/_example_orders/dto/list-orders.dto.ts` for the full worked example.
