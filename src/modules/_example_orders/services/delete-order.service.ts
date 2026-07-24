import { Injectable } from '@nestjs/common';
import { AbstractService } from '@/@shared/classes/service';
import { Result } from '@/@shared/classes/result';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IOrdersRepository } from '../repositories/orders.repository';
import { OrderAlreadyCancelledException } from '../errors/order-already-cancelled.exception';
import { OrderNotFoundException } from '../errors/order-not-found.exception';
import { OrderStatusEnum } from '../enums/order-status.enum';
import { deleteOrderDtoSchema, TDeleteOrderDto } from '../dto/delete-order.dto';

export abstract class TDeleteOrderService extends AbstractService<TDeleteOrderDto, void> {}

@Injectable()
export class DeleteOrderService implements TDeleteOrderService {
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
    this.logger.setContextName(DeleteOrderService.name);
  }

  async execute(dto: TDeleteOrderDto): Promise<Result<void>> {
    const invalid = AbstractService.validateDto(deleteOrderDtoSchema, dto);
    if (invalid) return Result.fail(invalid.error!);

    const { id } = dto;
    this.logger.log(`Deleting order ${id}`);

    const existing = await this.ordersRepository.findById({ id });
    if (!existing) {
      return Result.fail(new OrderNotFoundException(id));
    }
    if (existing.status === OrderStatusEnum.CANCELLED) {
      return Result.fail(new OrderAlreadyCancelledException(id));
    }

    await this.ordersRepository.softDelete(id);
    return Result.success();
  }
}
