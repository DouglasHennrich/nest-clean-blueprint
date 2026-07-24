import { Injectable } from '@nestjs/common';
import { AbstractService } from '@/@shared/classes/service';
import { Result } from '@/@shared/classes/result';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IOrdersRepository } from '../repositories/orders.repository';
import { IOrderModel } from '../models/order.struct';
import { OrderNotFoundException } from '../errors/order-not-found.exception';
import { updateOrderServiceDtoSchema, TUpdateOrderServiceDto } from '../dto/update-order.dto';

export abstract class TUpdateOrderService extends AbstractService<
  TUpdateOrderServiceDto,
  IOrderModel
> {}

@Injectable()
export class UpdateOrderService implements TUpdateOrderService {
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
    this.logger.setContextName(UpdateOrderService.name);
  }

  async execute(dto: TUpdateOrderServiceDto): Promise<Result<IOrderModel>> {
    const invalid = AbstractService.validateDto(updateOrderServiceDtoSchema, dto);
    if (invalid) return Result.fail(invalid.error!);

    const { id, ...changes } = dto;
    this.logger.log(`Updating order ${id}`);

    const existing = await this.ordersRepository.findById({ id });
    if (!existing) {
      return Result.fail(new OrderNotFoundException(id));
    }

    const updated = await this.ordersRepository.update({ id, data: changes });
    return Result.success(updated);
  }
}
