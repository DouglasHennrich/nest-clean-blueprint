import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import { TListOrdersService } from '../services/list-orders.service';
import { IOrderPresenter } from '../presenters/order.presenter';
import { listOrdersDtoSchema, TListOrdersDto } from '../dto/list-orders.dto';

@Controller('orders')
export class ListOrdersController {
  constructor(
    /// //////////////////////////
    //  Services
    /// //////////////////////////
    private listOrdersService: TListOrdersService,

    /// //////////////////////////
    //  Presenters
    /// //////////////////////////
    private orderPresenter: IOrderPresenter,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async listOrders(
    @Query(new ZodValidationPipe(listOrdersDtoSchema))
    query: TListOrdersDto,
  ) {
    const result = await this.listOrdersService.execute(query);
    if (result.error) {
      throw result.error;
    }
    const page = result.getValue()!;
    return {
      data: this.orderPresenter.presentMany({ entities: page.data }),
      hasNextPage: page.hasNextPage,
      total: page.total,
    };
  }
}
