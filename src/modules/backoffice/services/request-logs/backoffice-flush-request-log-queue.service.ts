import { Injectable } from '@nestjs/common';
import { Result } from '@/@shared/classes/result';
import { AbstractService } from '@/@shared/classes/service';
import { ILogger } from '@/@shared/classes/custom-logger';
import { TRequestLogFlushSchedulerService } from '@/modules/queues/services/request-log-flush-scheduler.service';

export abstract class TBackofficeFlushRequestLogQueueService extends AbstractService<void, void> {}

@Injectable()
export class BackofficeFlushRequestLogQueueService implements TBackofficeFlushRequestLogQueueService {
  constructor(
    /// //////////////////////////
    //  Services
    /// //////////////////////////
    private requestLogFlushSchedulerService: TRequestLogFlushSchedulerService,

    /// //////////////////////////
    //  Providers
    /// //////////////////////////
    public logger: ILogger,
  ) {
    this.logger.setContextName(BackofficeFlushRequestLogQueueService.name);
  }

  async execute(): Promise<Result<void>> {
    this.logger.log('Triggering manual request-log-flush job');

    const result = await this.requestLogFlushSchedulerService.triggerManualFlush();

    if (result.error) {
      this.logger.error(`Failed to trigger manual flush: ${result.error.message}`);
      return Result.fail(result.error);
    }

    this.logger.log('Manual request-log-flush job triggered successfully');
    return Result.success();
  }
}
