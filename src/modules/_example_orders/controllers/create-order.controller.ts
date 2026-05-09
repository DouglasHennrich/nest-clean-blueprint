import { Body, Controller, Post } from "@nestjs/common";
import { ZodValidationPipe } from "@/@shared/pipes/zod-validation.pipe";
import { AbstractApplicationException } from "@/@shared/errors/abstract-application-exception";
import { ReqContext } from "@/@decorators/request-context.decorator";
import { IRequestContext } from "@/@shared/protocols/request-context.struct";
import { TCreateOrderService } from "../services/create-order.service";
import { IOrderPresenter } from "../presenters/order.presenter";
import {
  createOrderDtoBodySchema,
  TCreateOrderDtoBodySchema,
} from "../dto/order.dto";

@Controller("orders")
export class CreateOrderController {
  constructor(
    private createOrderService: TCreateOrderService,
    private orderPresenter: IOrderPresenter,
  ) {}

  @Post()
  async createOrder(
    @Body(new ZodValidationPipe(createOrderDtoBodySchema))
    dto: TCreateOrderDtoBodySchema,
    @ReqContext() context: IRequestContext,
  ) {
    const result = await this.createOrderService.execute(dto, context);
    if (result.error) {
      if (result.error instanceof AbstractApplicationException) {
        result.error.context = context;
      }
      throw result.error;
    }
    return this.orderPresenter.present(result.getValue()!);
  }
}
