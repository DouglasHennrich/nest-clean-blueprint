import { Body, Controller, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import { TUpdateOrderService } from '../services/update-order.service';
import { IOrderPresenter } from '../presenters/order.presenter';
import {
  updateOrderDtoSchema,
  updateOrderParamDtoSchema,
  TUpdateOrderDto,
  TUpdateOrderParamDto,
} from '../dto/update-order.dto';

@Controller('orders/:id')
export class UpdateOrderController {
  constructor(
    /// //////////////////////////
    //  Services
    /// //////////////////////////
    private updateOrderService: TUpdateOrderService,

    /// //////////////////////////
    //  Presenters
    /// //////////////////////////
    private orderPresenter: IOrderPresenter,
  ) {}

  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateOrder(
    @Param(new ZodValidationPipe(updateOrderParamDtoSchema))
    param: TUpdateOrderParamDto,
    @Body(new ZodValidationPipe(updateOrderDtoSchema))
    body: TUpdateOrderDto,
  ) {
    const result = await this.updateOrderService.execute({
      id: param.id,
      ...body,
    });
    if (result.error) {
      throw result.error;
    }
    return this.orderPresenter.present({ entity: result.getValue()! });
  }
}
