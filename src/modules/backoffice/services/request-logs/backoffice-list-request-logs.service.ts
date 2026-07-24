import { Injectable } from '@nestjs/common';
import { Between, FindOptionsWhere, ILike } from 'typeorm';
import { Result } from '@/@shared/classes/result';
import { AbstractService } from '@/@shared/classes/service';
import { IPaginationModel } from '@/@shared/classes/repository';
import { TEnvService } from '@/modules/env/services/env.service';
import { ILogger } from '@/@shared/classes/custom-logger';
import {
  backofficeListRequestLogsDtoServiceSchema,
  TBackofficeListRequestLogsDtoServiceSchema,
} from '../../dto/request-logs/backoffice-list-request-logs.dto';
import { BackofficeRequestLogEntity } from '../../entities/request-logs/backoffice-request-log.entity';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';
import { IBackofficeRequestLogsRepository } from '../../repositories/request-logs/backoffice-request-logs.repository';

export abstract class TBackofficeListRequestLogsService extends AbstractService<
  TBackofficeListRequestLogsDtoServiceSchema,
  IPaginationModel<IBackofficeRequestLogModel>
> {}

@Injectable()
export class BackofficeListRequestLogsService implements TBackofficeListRequestLogsService {
  constructor(
    /// //////////////////////////
    //  Services
    /// //////////////////////////
    private envService: TEnvService,

    /// //////////////////////////
    //  Repositories
    /// //////////////////////////
    private requestLogsRepository: IBackofficeRequestLogsRepository,

    /// //////////////////////////
    //  Providers
    /// //////////////////////////
    public logger: ILogger,
  ) {
    this.logger.setContextName(BackofficeListRequestLogsService.name);
  }

  async execute({
    page = 1,
    offset = this.envService.get('UTILITIES_PAGINATION_LIMIT'),
    userId,
    method,
    path,
    statusCode,
    startDate,
    endDate,
  }: TBackofficeListRequestLogsDtoServiceSchema): Promise<
    Result<IPaginationModel<IBackofficeRequestLogModel>>
  > {
    const validateDtoResult = this.validateDto({
      page,
      offset,
      userId,
      method,
      path,
      statusCode,
      startDate,
      endDate,
    });

    if (validateDtoResult.error) {
      return Result.fail(validateDtoResult.error);
    }

    this.logger.log('Listing request logs');

    // Build WHERE conditions — a single AND-ed object, not an array (an array of
    // FindOptionsWhere is OR-joined by TypeORM, which would return rows matching
    // ANY filter instead of ALL of them).
    const where: FindOptionsWhere<BackofficeRequestLogEntity> = {};

    if (userId) {
      where.userId = userId;
    }

    if (method) {
      where.method = method;
    }

    if (path) {
      where.path = ILike(`%${path}%`);
    }

    if (statusCode) {
      where.statusCode = statusCode;
    }

    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      where.createdAt = Between(startDate, new Date());
    }

    const {
      data: requestLogs,
      hasNextPage,
      total,
    } = await this.requestLogsRepository.find({
      where,
      offset,
      page,
      order: {
        createdAt: 'DESC',
      },
    });

    return Result.success({
      total,
      hasNextPage,
      data: requestLogs,
    });
  }

  validateDto(
    serviceDto: TBackofficeListRequestLogsDtoServiceSchema,
  ): Result<TBackofficeListRequestLogsDtoServiceSchema> {
    try {
      const validatedDto = backofficeListRequestLogsDtoServiceSchema.parse(serviceDto);

      return Result.success(validatedDto);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
