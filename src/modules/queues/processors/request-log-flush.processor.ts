import { Job, UnrecoverableError } from 'bullmq';
import { Injectable, Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { ILogger } from '@/@shared/classes/custom-logger';
import { IBackofficeRequestLogsRepository } from '@/modules/backoffice/repositories/request-logs/backoffice-request-logs.repository';
import {
  REQUEST_LOG_REDIS_CLIENT,
  REQUEST_LOG_REDIS_LIST_KEY,
  IRequestLogPayload,
} from '../services/request-log-flush-scheduler.service';

/**
 * Request Log Flush Processor
 *
 * Reads from the Redis list and bulk-inserts into PostgreSQL.
 * Uses LRANGE → INSERT → LTRIM to eliminate data loss:
 * items are only removed from Redis after a successful INSERT.
 */
@Processor('request-log-flush')
@Injectable()
export class RequestLogFlushProcessor extends WorkerHost {
  constructor(
    /// //////////////////////////
    //  Repositories
    /// //////////////////////////
    private readonly requestLogsRepository: IBackofficeRequestLogsRepository,

    /// //////////////////////////
    //  Redis
    /// //////////////////////////
    @Inject(REQUEST_LOG_REDIS_CLIENT)
    private readonly redisClient: Redis,

    /// //////////////////////////
    //  Providers
    /// //////////////////////////
    private readonly logger: ILogger,
  ) {
    super();
    this.logger.setContextName(RequestLogFlushProcessor.name);
  }

  async process(job: Job): Promise<void> {
    await job.log(`Starting request-log flush job: ${job.id}`);

    let rawItems: string[];

    try {
      rawItems = await this.redisClient.lrange(
        REQUEST_LOG_REDIS_LIST_KEY,
        0,
        -1,
      );
    } catch (error) {
      const msg = `Failed to LRANGE Redis list: ${(error as Error).message}`;
      await job.log(msg);
      this.logger.error(msg);
      throw new UnrecoverableError(msg);
    }

    if (!rawItems || rawItems.length === 0) {
      await job.log('Redis list is empty — nothing to flush');
      return;
    }

    await job.log(`Read ${rawItems.length} items from Redis list`);

    const payloads: IRequestLogPayload[] = [];

    for (const raw of rawItems) {
      try {
        payloads.push(
          this.truncatePayload(JSON.parse(raw) as IRequestLogPayload),
        );
      } catch {
        this.logger.warn(`Skipping malformed request log payload: ${raw}`);
      }
    }

    if (payloads.length === 0) {
      await job.log('All read items were malformed — nothing to insert');
      return;
    }

    try {
      await this.requestLogsRepository.bulkCreate({
        data: payloads.map((payload) => ({ data: payload as any })),
        options: {
          noModelReturn: true,
        },
      });

      const msg = `Successfully bulk-inserted ${payloads.length} request logs`;
      await job.log(msg);
    } catch (error) {
      const msg = `Failed to bulk-insert request logs: ${(error as Error).message}`;
      await job.log(msg);
      this.logger.error(msg);
      // INSERT failed — do NOT trim, data is still safe in Redis
      throw new UnrecoverableError(msg);
    }

    // INSERT succeeded — now safely remove the processed items
    try {
      await this.redisClient.ltrim(
        REQUEST_LOG_REDIS_LIST_KEY,
        rawItems.length,
        -1,
      );
    } catch (error) {
      // Non-fatal: items are already persisted, LTRIM failure only causes duplicates on retry
      this.logger.warn(
        `LTRIM failed after successful INSERT (may cause duplicates): ${(error as Error).message}`,
      );
    }
  }

  private truncatePayload(payload: IRequestLogPayload): IRequestLogPayload {
    const t = (
      value: string | undefined,
      limit: number,
    ): string | undefined => {
      if (typeof value === 'string' && value.length > limit) {
        return value.slice(0, limit);
      }
      return value;
    };

    return {
      ...payload,
      body: t(payload.body, 10_000),
      params: t(payload.params, 2_000),
      query: t(payload.query, 2_000),
      headers: t(payload.headers, 2_000),
      responseBody: t(payload.responseBody, 5_000),
      errorMessage: t(payload.errorMessage, 2_000),
      stackTrace: t(payload.stackTrace, 5_000),
      entityIds: t(payload.entityIds, 2_000),
    };
  }
}
