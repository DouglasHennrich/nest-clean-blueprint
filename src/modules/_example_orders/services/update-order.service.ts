import { Injectable } from "@nestjs/common";
import { AbstractService } from "@/@shared/classes/service";
import { Result } from "@/@shared/classes/result";
import { ILogger, CustomLogger } from "@/@shared/classes/custom-logger";
import { IRequestContext } from "@/@shared/protocols/request-context.struct";
import { IOrdersRepository } from "../repositories/orders.repository";
import { IOrderModel } from "../models/order.model";
import { OrderNotFoundException } from "../errors/order.errors";
import { TUpdateOrderDtoServiceSchema } from "../dto/order.dto";

export abstract class TUpdateOrderService extends AbstractService<
  TUpdateOrderDtoServiceSchema,
  IOrderModel
> {}

@Injectable()
export class UpdateOrderService implements TUpdateOrderService {
  public logger: ILogger = new CustomLogger(UpdateOrderService.name);

  constructor(private ordersRepository: IOrdersRepository) {}

  async execute(
    { id, ...changes }: TUpdateOrderDtoServiceSchema,
    context?: IRequestContext,
  ): Promise<Result<IOrderModel>> {
    this.logger.log(`Updating order ${id}`, context);

    const existing = await this.ordersRepository.findById(id);
    if (!existing) {
      return Result.fail(new OrderNotFoundException(id, context));
    }

    const updated = await this.ordersRepository.update(id, changes as any);
    return Result.success(updated);
  }
}
