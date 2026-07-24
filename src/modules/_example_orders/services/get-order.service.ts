import { Injectable } from '@nestjs/common';
import { AbstractService } from '@/@shared/classes/service';
import { Result } from '@/@shared/classes/result';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IOrdersRepository } from '../repositories/orders.repository';
import { IOrderModel } from '../models/order.struct';
import { OrderNotFoundException } from '../errors/order-not-found.exception';
import { getOrderDtoSchema, TGetOrderDto } from '../dto/get-order.dto';

export abstract class TGetOrderService extends AbstractService<TGetOrderDto, IOrderModel> {}

@Injectable()
export class GetOrderService implements TGetOrderService {
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
    this.logger.setContextName(GetOrderService.name);
  }

  async execute(dto: TGetOrderDto): Promise<Result<IOrderModel>> {
    const invalid = AbstractService.validateDto(getOrderDtoSchema, dto);
    if (invalid) return Result.fail(invalid.error!);

    const { id } = dto;
    this.logger.log(`Fetching order ${id}`);

    const order = await this.ordersRepository.findById({ id });
    if (!order) {
      return Result.fail(new OrderNotFoundException(id));
    }
    return Result.success(order);
  }
}
