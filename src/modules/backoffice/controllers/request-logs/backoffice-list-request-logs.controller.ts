import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import { TBackofficeListRequestLogsService } from '../../services/request-logs/backoffice-list-request-logs.service';
import {
  backofficeListRequestLogsDtoQuerySchema,
  TBackofficeListRequestLogsDtoQuerySchema,
} from '../../dto/request-logs/backoffice-list-request-logs.dto';
import { BackofficeToken } from '../../decorators/backoffice.decorator';
import { BackofficeGuard } from '../../guards/backoffice.guard';
import { IBackofficeRequestLogPresenter } from '../../presenters/request-logs/backoffice-request-log.presenter';

@Controller('backoffice/request-logs')
@UseGuards(BackofficeGuard)
export class BackofficeListRequestLogsController {
  constructor(
    private listRequestLogsService: TBackofficeListRequestLogsService,
    private requestLogPresenter: IBackofficeRequestLogPresenter,
  ) {}

  @BackofficeToken()
  @Get()
  async listRequestLogs(
    @Query(new ZodValidationPipe(backofficeListRequestLogsDtoQuerySchema))
    listRequestLogsDto: TBackofficeListRequestLogsDtoQuerySchema,
  ) {
    const result = await this.listRequestLogsService.execute({
      ...listRequestLogsDto,
    });

    if (result.error) {
      throw result.error;
    }

    const page = result.getValue()!;

    return {
      data: this.requestLogPresenter.presentMany({ entities: page.data }),
      hasNextPage: page.hasNextPage,
      total: page.total,
    };
  }
}
