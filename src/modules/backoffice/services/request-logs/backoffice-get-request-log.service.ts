import { Injectable } from '@nestjs/common';
import { Result } from '@/@shared/classes/result';
import { AbstractService } from '@/@shared/classes/service';
import { ILogger } from '@/@shared/classes/custom-logger';
import {
  backofficeGetRequestLogDtoServiceSchema,
  TBackofficeGetRequestLogDtoServiceSchema,
} from '../../dto/request-logs/backoffice-get-request-log.dto';
import { IBackofficeRequestLogsRepository } from '../../repositories/request-logs/backoffice-request-logs.repository';
import { IBackofficeRequestLogModel } from '../../models/request-logs/backoffice-request-log.struct';
import { BackofficeRequestLogNotFoundException } from '../../errors/request-logs/backoffice-request-log-not-found.exception';

export abstract class TBackofficeGetRequestLogService extends AbstractService<
  TBackofficeGetRequestLogDtoServiceSchema,
  IBackofficeRequestLogModel
> {}

@Injectable()
export class BackofficeGetRequestLogService implements TBackofficeGetRequestLogService {
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
    this.logger.setContextName(BackofficeGetRequestLogService.name);
  }

  async execute(
    serviceDto: TBackofficeGetRequestLogDtoServiceSchema,
  ): Promise<Result<IBackofficeRequestLogModel>> {
    const validateDtoResult = this.validateDto(serviceDto);

    if (validateDtoResult.error) {
      return Result.fail(validateDtoResult.error);
    }

    const validatedDto = validateDtoResult.getValue()!;

    this.logger.log(`Getting request log: ${JSON.stringify(validatedDto)}`);

    const requestLog = await this.requestLogsRepository.findById({
      id: validatedDto.id,
    });

    if (!requestLog) {
      return Result.fail(new BackofficeRequestLogNotFoundException(validatedDto.id));
    }

    return Result.success(requestLog);
  }

  validateDto(
    serviceDto: TBackofficeGetRequestLogDtoServiceSchema,
  ): Result<TBackofficeGetRequestLogDtoServiceSchema> {
    try {
      const validatedDto = backofficeGetRequestLogDtoServiceSchema.parse(serviceDto);

      return Result.success(validatedDto);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
