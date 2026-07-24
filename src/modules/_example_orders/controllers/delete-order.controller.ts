import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import { TDeleteOrderService } from '../services/delete-order.service';
import { IOrderPresenter } from '../presenters/order.presenter';
import { deleteOrderDtoSchema, TDeleteOrderDto } from '../dto/delete-order.dto';

@Controller('orders/:id')
export class DeleteOrderController {
  constructor(
    /// //////////////////////////
    //  Services
    /// //////////////////////////
    private deleteOrderService: TDeleteOrderService,

    /// //////////////////////////
    //  Presenters
    /// //////////////////////////
    private orderPresenter: IOrderPresenter,
  ) {}

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteOrder(
    @Param(new ZodValidationPipe(deleteOrderDtoSchema))
    param: TDeleteOrderDto,
  ) {
    const result = await this.deleteOrderService.execute(param);
    if (result.error) {
      throw result.error;
    }
    return this.orderPresenter.presentSuccess();
  }
}
