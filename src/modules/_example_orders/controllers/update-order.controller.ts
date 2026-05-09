import { Body, Controller, Param, Patch } from "@nestjs/common";
import { ZodValidationPipe } from "@/@shared/pipes/zod-validation.pipe";
import { AbstractApplicationException } from "@/@shared/errors/abstract-application-exception";
import { ReqContext } from "@/@decorators/request-context.decorator";
import { IRequestContext } from "@/@shared/protocols/request-context.struct";
import { TUpdateOrderService } from "../services/update-order.service";
import { IOrderPresenter } from "../presenters/order.presenter";
import {
  updateOrderDtoBodySchema,
  updateOrderDtoParamSchema,
  TUpdateOrderDtoBodySchema,
  TUpdateOrderDtoParamSchema,
} from "../dto/order.dto";

@Controller("orders/:id")
export class UpdateOrderController {
  constructor(
    private updateOrderService: TUpdateOrderService,
    private orderPresenter: IOrderPresenter,
  ) {}

  @Patch()
  async updateOrder(
    @Param(new ZodValidationPipe(updateOrderDtoParamSchema))
    param: TUpdateOrderDtoParamSchema,
    @Body(new ZodValidationPipe(updateOrderDtoBodySchema))
    body: TUpdateOrderDtoBodySchema,
    @ReqContext() context: IRequestContext,
  ) {
    const result = await this.updateOrderService.execute(
      { id: param.id, ...body },
      context,
    );
    if (result.error) {
      if (result.error instanceof AbstractApplicationException) {
        result.error.context = context;
      }
      throw result.error;
    }
    return this.orderPresenter.present(result.getValue()!);
  }
}
