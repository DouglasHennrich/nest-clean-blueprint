import { Controller, Get, Param } from "@nestjs/common";
import { ZodValidationPipe } from "@/@shared/pipes/zod-validation.pipe";
import { AbstractApplicationException } from "@/@shared/errors/abstract-application-exception";
import { ReqContext } from "@/@decorators/request-context.decorator";
import { IRequestContext } from "@/@shared/protocols/request-context.struct";
import { TGetOrderService } from "../services/get-order.service";
import { IOrderPresenter } from "../presenters/order.presenter";
import {
  getOrderDtoParamSchema,
  TGetOrderDtoParamSchema,
} from "../dto/order.dto";

// Convention: full path lives in @Controller. The HTTP method decorator stays empty.
@Controller("orders/:id")
export class GetOrderController {
  constructor(
    private getOrderService: TGetOrderService,
    private orderPresenter: IOrderPresenter,
  ) {}

  @Get()
  async getOrder(
    @Param(new ZodValidationPipe(getOrderDtoParamSchema))
    param: TGetOrderDtoParamSchema,
    @ReqContext() context: IRequestContext,
  ) {
    const result = await this.getOrderService.execute(param, context);
    if (result.error) {
      if (result.error instanceof AbstractApplicationException) {
        result.error.context = context;
      }
      throw result.error;
    }
    return this.orderPresenter.present(result.getValue()!);
  }
}
