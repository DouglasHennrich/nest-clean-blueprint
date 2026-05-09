import { Controller, Get, Query } from "@nestjs/common";
import { ZodValidationPipe } from "@/@shared/pipes/zod-validation.pipe";
import { AbstractApplicationException } from "@/@shared/errors/abstract-application-exception";
import { ReqContext } from "@/@decorators/request-context.decorator";
import { IRequestContext } from "@/@shared/protocols/request-context.struct";
import { TListOrdersService } from "../services/list-orders.service";
import { IOrderPresenter } from "../presenters/order.presenter";
import {
  listOrdersDtoQuerySchema,
  TListOrdersDtoQuerySchema,
} from "../dto/order.dto";

@Controller("orders")
export class ListOrdersController {
  constructor(
    private listOrdersService: TListOrdersService,
    private orderPresenter: IOrderPresenter,
  ) {}

  @Get()
  async listOrders(
    @Query(new ZodValidationPipe(listOrdersDtoQuerySchema))
    query: TListOrdersDtoQuerySchema,
    @ReqContext() context: IRequestContext,
  ) {
    const result = await this.listOrdersService.execute(query, context);
    if (result.error) {
      if (result.error instanceof AbstractApplicationException) {
        result.error.context = context;
      }
      throw result.error;
    }
    const page = result.getValue()!;
    return {
      data: this.orderPresenter.presentMany(page.data),
      hasNextPage: page.hasNextPage,
      total: page.total,
    };
  }
}
