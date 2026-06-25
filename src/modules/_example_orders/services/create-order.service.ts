import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AbstractService } from '@/@shared/classes/service';
import { Result } from '@/@shared/classes/result';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IRequestContext } from '@/@shared/protocols/request-context.struct';
import { IOrdersRepository } from '../repositories/orders.repository';
import { IOrderModel } from '../models/order.model';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { TCreateOrderDtoServiceSchema } from '../dto/order.dto';

export abstract class TCreateOrderService extends AbstractService<
  TCreateOrderDtoServiceSchema,
  IOrderModel
> {}

@Injectable()
export class CreateOrderService implements TCreateOrderService {
  constructor(
    /// //////////////////////////
    //  Repositories
    /// //////////////////////////
    private ordersRepository: IOrdersRepository,

    /// //////////////////////////
    //  Providers
    /// //////////////////////////
    public logger: ILogger,
  ) {
    this.logger.setContextName(CreateOrderService.name);
  }

  async execute(
    dto: TCreateOrderDtoServiceSchema,
    context?: IRequestContext,
  ): Promise<Result<IOrderModel>> {
    this.logger.log(`Creating order for ${dto.customerName}`, context);

    const order = await this.ordersRepository.create({
      code: `ORD-${uuidv4().slice(0, 8).toUpperCase()}`,
      customerName: dto.customerName,
      amount: dto.amount,
      status: OrderStatusEnum.PENDING,
    });

    return Result.success(order);
  }
}
