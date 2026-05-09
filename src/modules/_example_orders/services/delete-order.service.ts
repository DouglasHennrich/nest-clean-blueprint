import { Injectable } from "@nestjs/common";
import { AbstractService } from "@/@shared/classes/service";
import { Result } from "@/@shared/classes/result";
import { ILogger, CustomLogger } from "@/@shared/classes/custom-logger";
import { IRequestContext } from "@/@shared/protocols/request-context.struct";
import { IOrdersRepository } from "../repositories/orders.repository";
import {
  OrderAlreadyCancelledException,
  OrderNotFoundException,
} from "../errors/order.errors";
import { OrderStatusEnum } from "../enums/order-status.enum";
import { TDeleteOrderDtoParamSchema } from "../dto/order.dto";

export abstract class TDeleteOrderService extends AbstractService<
  TDeleteOrderDtoParamSchema,
  void
> {}

@Injectable()
export class DeleteOrderService implements TDeleteOrderService {
  public logger: ILogger = new CustomLogger(DeleteOrderService.name);

  constructor(private ordersRepository: IOrdersRepository) {}

  async execute(
    { id }: TDeleteOrderDtoParamSchema,
    context?: IRequestContext,
  ): Promise<Result<void>> {
    this.logger.log(`Deleting order ${id}`, context);

    const existing = await this.ordersRepository.findById(id);
    if (!existing) {
      return Result.fail(new OrderNotFoundException(id, context));
    }
    if (existing.status === OrderStatusEnum.CANCELLED) {
      return Result.fail(new OrderAlreadyCancelledException(id, context));
    }

    await this.ordersRepository.softDelete(id);
    return Result.success();
  }
}
