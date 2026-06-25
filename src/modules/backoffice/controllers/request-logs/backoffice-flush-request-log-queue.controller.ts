import { Controller, Post } from '@nestjs/common';
import { IRequestContext } from '@/@shared/protocols/request-context.struct';
import { ReqContext } from '@/@decorators/request-context.decorator';
import { AbstractApplicationException } from '@/@shared/errors/abstract-application-exception';
import { TBackofficeFlushRequestLogQueueService } from '../../services/request-logs/backoffice-flush-request-log-queue.service';
import { BackofficeToken } from '../../decorators/backoffice.decorator';

@Controller('backoffice/request-logs/queue/flush-queue')
export class BackofficeFlushRequestLogQueueController {
  constructor(
    private flushRequestLogQueueService: TBackofficeFlushRequestLogQueueService,
  ) {}

  @BackofficeToken()
  @Post()
  async flushRequestLogQueue(@ReqContext() context: IRequestContext) {
    const result = await this.flushRequestLogQueueService.execute();

    if (result.error) {
      if (result.error instanceof AbstractApplicationException) {
        result.error.context = context;
      }

      throw result.error;
    }

    return { message: 'request-log-flush job triggered successfully' };
  }
}
