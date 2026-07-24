import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import { TGetOrderService } from '../services/get-order.service';
import { IOrderPresenter } from '../presenters/order.presenter';
import { getOrderDtoSchema, TGetOrderDto } from '../dto/get-order.dto';

// Convention: full path lives in @Controller. The HTTP method decorator stays empty.
@Controller('orders/:id')
export class GetOrderController {
  constructor(
    /// //////////////////////////
    //  Services
    /// //////////////////////////
    private getOrderService: TGetOrderService,

    /// //////////////////////////
    //  Presenters
    /// //////////////////////////
    private orderPresenter: IOrderPresenter,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getOrder(
    @Param(new ZodValidationPipe(getOrderDtoSchema))
    param: TGetOrderDto,
  ) {
    const result = await this.getOrderService.execute(param);
    if (result.error) {
      throw result.error;
    }
    return this.orderPresenter.present({ entity: result.getValue()! });
  }
}
