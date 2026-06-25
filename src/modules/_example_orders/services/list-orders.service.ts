import { Injectable } from '@nestjs/common';
import { AbstractService } from '@/@shared/classes/service';
import { Result } from '@/@shared/classes/result';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IRequestContext } from '@/@shared/protocols/request-context.struct';
import { IPagination } from '@/@shared/classes/repository';
import { TEnvService } from '@/modules/env/services/env.service';
import { IOrdersRepository } from '../repositories/orders.repository';
import { IOrderModel } from '../models/order.model';
import { TListOrdersDtoServiceSchema } from '../dto/order.dto';

export abstract class TListOrdersService extends AbstractService<
  TListOrdersDtoServiceSchema,
  IPagination<IOrderModel>
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

  async execute(
    { page, offset, status }: TListOrdersDtoServiceSchema,
    context?: IRequestContext,
  ): Promise<Result<IPagination<IOrderModel>>> {
    this.logger.log(`Listing orders (page=${page}, status=${status})`, context);

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
