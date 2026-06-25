import { Controller, Get, Param } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import { IRequestContext } from '@/@shared/protocols/request-context.struct';
import { ReqContext } from '@/@decorators/request-context.decorator';
import { AbstractApplicationException } from '@/@shared/errors/abstract-application-exception';
import {
  backofficeGetRequestLogDtoParamSchema,
  TBackofficeGetRequestLogDtoParamSchema,
} from '../../dto/request-logs/backoffice-get-request-log.dto';
import { TBackofficeGetRequestLogService } from '../../services/request-logs/backoffice-get-request-log.service';
import { BackofficeToken } from '../../decorators/backoffice.decorator';

@Controller('backoffice/request-logs/:id')
export class BackofficeGetRequestLogController {
  constructor(private getRequestLogService: TBackofficeGetRequestLogService) {}

  @BackofficeToken()
  @Get()
  async getRequestLog(
    @ReqContext() context: IRequestContext,
    @Param(new ZodValidationPipe(backofficeGetRequestLogDtoParamSchema))
    params: TBackofficeGetRequestLogDtoParamSchema,
  ) {
    const result = await this.getRequestLogService.execute({
      ...params,
    });

    if (result.error) {
      if (result.error instanceof AbstractApplicationException) {
        result.error.context = context;
      }

      throw result.error;
    }

    return result.getValue();
  }
}
