import { Injectable } from '@nestjs/common';
import { Result } from '@/@shared/classes/result';
import { AbstractService } from '@/@shared/classes/service';
import { ILogger } from '@/@shared/classes/custom-logger';
import { TBackofficeCreateRequestLogDtoServiceSchema } from '../../dto/request-logs/backoffice-create-request-log.dto';
import { IBackofficeRequestLogsRepository } from '../../repositories/request-logs/backoffice-request-logs.repository';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';

export abstract class TBackofficeCreateRequestLogService extends AbstractService<
  TBackofficeCreateRequestLogDtoServiceSchema,
  IBackofficeRequestLogModel
> {}

@Injectable()
export class BackofficeCreateRequestLogService implements TBackofficeCreateRequestLogService {
  constructor(
    /// //////////////////////////
    //  Repositories
    /// //////////////////////////
    private requestLogsRepository: IBackofficeRequestLogsRepository,

    /// //////////////////////////
    //  Providers
    /// //////////////////////////
    public logger: ILogger,
  ) {
    this.logger.setContextName(BackofficeCreateRequestLogService.name);
  }

  async execute(
    serviceDto: TBackofficeCreateRequestLogDtoServiceSchema,
  ): Promise<Result<IBackofficeRequestLogModel>> {
    const requestLog = await this.requestLogsRepository.create(serviceDto);

    return Result.success(requestLog);
  }
}
