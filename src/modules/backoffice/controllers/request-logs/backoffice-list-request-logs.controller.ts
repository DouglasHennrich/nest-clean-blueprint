import { Controller, Get, Query } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import { IRequestContext } from '@/@shared/protocols/request-context.struct';
import { ReqContext } from '@/@decorators/request-context.decorator';
import { AbstractApplicationException } from '@/@shared/errors/abstract-application-exception';
import { TBackofficeListRequestLogsService } from '../../services/request-logs/backoffice-list-request-logs.service';
import {
  backofficeListRequestLogsDtoQuerySchema,
  TBackofficeListRequestLogsDtoQuerySchema,
} from '../../dto/request-logs/backoffice-list-request-logs.dto';
import { BackofficeToken } from '../../decorators/backoffice.decorator';

@Controller('backoffice/request-logs')
export class BackofficeListRequestLogsController {
  constructor(
    private listRequestLogsService: TBackofficeListRequestLogsService,
  ) {}

  @BackofficeToken()
  @Get()
  async listRequestLogs(
    @ReqContext() context: IRequestContext,
    @Query(new ZodValidationPipe(backofficeListRequestLogsDtoQuerySchema))
    listRequestLogsDto: TBackofficeListRequestLogsDtoQuerySchema,
  ) {
    const result = await this.listRequestLogsService.execute({
      ...listRequestLogsDto,
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
