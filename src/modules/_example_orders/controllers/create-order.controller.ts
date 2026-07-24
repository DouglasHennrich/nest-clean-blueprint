import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import { TCreateOrderService } from '../services/create-order.service';
import { IOrderPresenter } from '../presenters/order.presenter';
import { createOrderDtoSchema, TCreateOrderDto } from '../dto/create-order.dto';

@Controller('orders')
export class CreateOrderController {
  constructor(
    /// //////////////////////////
    //  Services
    /// //////////////////////////
    private createOrderService: TCreateOrderService,

    /// //////////////////////////
    //  Presenters
    /// //////////////////////////
    private orderPresenter: IOrderPresenter,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body(new ZodValidationPipe(createOrderDtoSchema))
    dto: TCreateOrderDto,
  ) {
    const result = await this.createOrderService.execute(dto);
    if (result.error) {
      throw result.error;
    }
    return this.orderPresenter.present({ entity: result.getValue()! });
  }
}
