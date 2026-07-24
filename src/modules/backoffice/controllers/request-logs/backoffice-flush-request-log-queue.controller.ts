import { Controller, Post, UseGuards } from '@nestjs/common';
import { TBackofficeFlushRequestLogQueueService } from '../../services/request-logs/backoffice-flush-request-log-queue.service';
import { BackofficeToken } from '../../decorators/backoffice.decorator';
import { BackofficeGuard } from '../../guards/backoffice.guard';
import { IBackofficeRequestLogPresenter } from '../../presenters/request-logs/backoffice-request-log.presenter';

@Controller('backoffice/request-logs/queue/flush-queue')
@UseGuards(BackofficeGuard)
export class BackofficeFlushRequestLogQueueController {
  constructor(
    private flushRequestLogQueueService: TBackofficeFlushRequestLogQueueService,
    private requestLogPresenter: IBackofficeRequestLogPresenter,
  ) {}

  @BackofficeToken()
  @Post()
  async flushRequestLogQueue() {
    const result = await this.flushRequestLogQueueService.execute();

    if (result.error) {
      throw result.error;
    }

    return this.requestLogPresenter.presentSuccess({
      message: 'request-log-flush job triggered successfully',
    });
  }
}
