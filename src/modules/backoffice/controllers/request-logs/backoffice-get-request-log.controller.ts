import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from '@/@shared/pipes/zod-validation.pipe';
import {
  backofficeGetRequestLogDtoParamSchema,
  TBackofficeGetRequestLogDtoParamSchema,
} from '../../dto/request-logs/backoffice-get-request-log.dto';
import { TBackofficeGetRequestLogService } from '../../services/request-logs/backoffice-get-request-log.service';
import { BackofficeToken } from '../../decorators/backoffice.decorator';
import { BackofficeGuard } from '../../guards/backoffice.guard';
import { IBackofficeRequestLogPresenter } from '../../presenters/request-logs/backoffice-request-log.presenter';

@Controller('backoffice/request-logs/:id')
@UseGuards(BackofficeGuard)
export class BackofficeGetRequestLogController {
  constructor(
    private getRequestLogService: TBackofficeGetRequestLogService,
    private requestLogPresenter: IBackofficeRequestLogPresenter,
  ) {}

  @BackofficeToken()
  @Get()
  async getRequestLog(
    @Param(new ZodValidationPipe(backofficeGetRequestLogDtoParamSchema))
    params: TBackofficeGetRequestLogDtoParamSchema,
  ) {
    const result = await this.getRequestLogService.execute({
      ...params,
    });

    if (result.error) {
      throw result.error;
    }

    return this.requestLogPresenter.present({ entity: result.getValue()! });
  }
}
