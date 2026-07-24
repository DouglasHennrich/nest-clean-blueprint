import { Injectable } from '@nestjs/common';
import { AbstractService } from '@/@shared/classes/service';
import { Result } from '@/@shared/classes/result';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IPaginationModel } from '@/@shared/classes/repository';
import { TEnvService } from '@/modules/env/services/env.service';
import { IOrdersRepository } from '../repositories/orders.repository';
import { IOrderModel } from '../models/order.struct';
import { listOrdersDtoSchema, TListOrdersDto } from '../dto/list-orders.dto';

export abstract class TListOrdersService extends AbstractService<
  TListOrdersDto,
  IPaginationModel<IOrderModel>
> {}

@Injectable()
export class ListOrdersService implements TListOrdersService {
  constructor(
    /// //////////////////////////
    //  Services
    /// //////////////////////////
    private envService: TEnvService,

    /// //////////////////////////
    //  Repositories
    /// //////////////////////////
    private ordersRepository: IOrdersRepository,

    /// //////////////////////////
    //  Providers
    /// //////////////////////////
    public logger: ILogger,
  ) {
    this.logger.setContextName(ListOrdersService.name);
  }

  async execute(dto: TListOrdersDto): Promise<Result<IPaginationModel<IOrderModel>>> {
    const invalid = AbstractService.validateDto(listOrdersDtoSchema, dto);
    if (invalid) return Result.fail(invalid.error!);

    const { page, offset, status } = dto;
    this.logger.log(`Listing orders (page=${page}, status=${status})`);

    const where = status ? { status } : undefined;
    const result = await this.ordersRepository.find({
      where: where,
      page,
      offset,
      order: { createdAt: 'DESC' } as any,
    });

    return Result.success(result);
  }
}
