import { Injectable } from "@nestjs/common";
import { AbstractService } from "@/@shared/classes/service";
import { Result } from "@/@shared/classes/result";
import { ILogger, CustomLogger } from "@/@shared/classes/custom-logger";
import { IRequestContext } from "@/@shared/protocols/request-context.struct";
import { IOrdersRepository } from "../repositories/orders.repository";
import { IOrderModel } from "../models/order.model";
import { OrderNotFoundException } from "../errors/order.errors";
import { TGetOrderDtoParamSchema } from "../dto/order.dto";

export abstract class TGetOrderService extends AbstractService<
  TGetOrderDtoParamSchema,
  IOrderModel
> {}

@Injectable()
export class GetOrderService implements TGetOrderService {
  public logger: ILogger = new CustomLogger(GetOrderService.name);

  constructor(private ordersRepository: IOrdersRepository) {}

  async execute(
    { id }: TGetOrderDtoParamSchema,
    context?: IRequestContext,
  ): Promise<Result<IOrderModel>> {
    this.logger.log(`Fetching order ${id}`, context);

    const order = await this.ordersRepository.findById(id);
    if (!order) {
      return Result.fail(new OrderNotFoundException(id, context));
    }
    return Result.success(order);
  }
}
