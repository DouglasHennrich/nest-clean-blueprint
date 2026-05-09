import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from "@nestjs/common";
import { ZodValidationPipe } from "@/@shared/pipes/zod-validation.pipe";
import { AbstractApplicationException } from "@/@shared/errors/abstract-application-exception";
import { ReqContext } from "@/@decorators/request-context.decorator";
import { IRequestContext } from "@/@shared/protocols/request-context.struct";
import { TDeleteOrderService } from "../services/delete-order.service";
import {
  deleteOrderDtoParamSchema,
  TDeleteOrderDtoParamSchema,
} from "../dto/order.dto";

@Controller("orders/:id")
export class DeleteOrderController {
  constructor(private deleteOrderService: TDeleteOrderService) {}

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrder(
    @Param(new ZodValidationPipe(deleteOrderDtoParamSchema))
    param: TDeleteOrderDtoParamSchema,
    @ReqContext() context: IRequestContext,
  ): Promise<void> {
    const result = await this.deleteOrderService.execute(param, context);
    if (result.error) {
      if (result.error instanceof AbstractApplicationException) {
        result.error.context = context;
      }
      throw result.error;
    }
  }
}
