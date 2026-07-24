import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AbstractService } from '@/@shared/classes/service';
import { Result } from '@/@shared/classes/result';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IOrdersRepository } from '../repositories/orders.repository';
import { IOrderModel } from '../models/order.struct';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { createOrderDtoSchema, TCreateOrderDto } from '../dto/create-order.dto';

export abstract class TCreateOrderService extends AbstractService<TCreateOrderDto, IOrderModel> {}

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

  async execute(dto: TCreateOrderDto): Promise<Result<IOrderModel>> {
    const invalid = AbstractService.validateDto(createOrderDtoSchema, dto);
    if (invalid) return Result.fail(invalid.error!);

    this.logger.log(`Creating order for ${dto.customerName}`);

    const order = await this.ordersRepository.create({
      data: {
        code: `ORD-${uuidv4().slice(0, 8).toUpperCase()}`,
        customerName: dto.customerName,
        amount: dto.amount,
        status: OrderStatusEnum.PENDING,
      },
    });

    return Result.success(order);
  }
}
