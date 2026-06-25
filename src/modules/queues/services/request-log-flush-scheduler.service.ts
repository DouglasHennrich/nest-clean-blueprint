import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { Result } from '@/@shared/classes/result';
import { ILogger } from '@/@shared/classes/custom-logger';
import { TEnvService } from '@/modules/env/services/env.service';

export const REQUEST_LOG_REDIS_CLIENT = 'REQUEST_LOG_REDIS_CLIENT';
export const REQUEST_LOG_REDIS_LIST_KEY = 'pitanga:request-logs:pending';

export interface IRequestLogPayload {
  method: string;
  path: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userType?: string;
  body?: string;
  params?: string;
  query?: string;
  headers?: string;
  files?: string;
  file?: string;
  statusCode?: number;
  responseTime?: number;
  ip?: string;
  userAgent?: string;
  errorMessage?: string;
  stackTrace?: string;
  requestId?: string;
  responseBody?: string;
  entityIds?: string;
}

export abstract class TRequestLogFlushSchedulerService {
  abstract enqueue(payload: IRequestLogPayload): Promise<void>;
  abstract triggerManualFlush(): Promise<Result<void>>;
}

@Injectable()
export class RequestLogFlushSchedulerService implements TRequestLogFlushSchedulerService {
  constructor(
    /// //////////////////////////
    //  Services
    /// //////////////////////////
    private envService: TEnvService,

    /// //////////////////////////
    //  Providers
    /// //////////////////////////
    @Inject(REQUEST_LOG_REDIS_CLIENT)
    private redisClient: Redis,

    @InjectQueue('request-log-flush')
    private requestLogFlushQueue: Queue,

    public logger: ILogger,
  ) {
    this.logger.setContextName(RequestLogFlushSchedulerService.name);
  }

  async enqueue(payload: IRequestLogPayload): Promise<void> {
    // try {
    //   const serialized = JSON.stringify(payload);
    //   await this.redisClient.rpush(REQUEST_LOG_REDIS_LIST_KEY, serialized);
    //   const listLength = await this.redisClient.llen(
    //     REQUEST_LOG_REDIS_LIST_KEY,
    //   );
    //   const batchSize = this.envService.get('QUEUE_REQUEST_LOGS_BATCH_SIZE');
    //   if (listLength >= batchSize) {
    //     await this.triggerFlushJob();
    //   }
    // } catch (error) {
    //   this.logger.error(
    //     `Failed to enqueue request log: ${(error as Error).message}`,
    //   );
    // }
  }

  async triggerManualFlush(): Promise<Result<void>> {
    try {
      await this.triggerFlushJob();
      return Result.success();
    } catch (error) {
      this.logger.error(
        `Failed to trigger manual flush: ${(error as Error).message}`,
      );
      return Result.fail(error as Error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledFlush(): Promise<void> {
    try {
      const listLength = await this.redisClient.llen(
        REQUEST_LOG_REDIS_LIST_KEY,
      );

      if (listLength > 0) {
        await this.triggerFlushJob();
      }
    } catch (error) {
      this.logger.error(`Scheduled flush failed: ${(error as Error).message}`);
    }
  }

  private async triggerFlushJob(): Promise<void> {
    const jobId = `flush-${Date.now()}`;

    await this.requestLogFlushQueue.add(
      'flush',
      {},
      {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    );
  }
}
