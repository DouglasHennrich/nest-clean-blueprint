import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { ILogger } from "@/@shared/classes/custom-logger";
import { Result } from "@/@shared/classes/result";
import { IExampleJobData } from "../dto/example-job.dto";

/**
 * TExampleSchedulerService — DI token for the example queue scheduler.
 */
export abstract class TExampleSchedulerService {
  abstract enqueue(
    data: IExampleJobData,
    idempotencyKey?: string,
  ): Promise<Result<void>>;
}

@Injectable()
export class ExampleSchedulerService implements TExampleSchedulerService {
  constructor(
    @InjectQueue("example-queue") private readonly queue: Queue,
    public readonly logger: ILogger,
  ) {
    this.logger.setContextName(ExampleSchedulerService.name);
  }

  async enqueue(
    data: IExampleJobData,
    idempotencyKey?: string,
  ): Promise<Result<void>> {
    try {
      const jobId = idempotencyKey ?? `example-${data.entityId}`;

      // Idempotency check — skip if job is already in an active state
      const existing = await this.queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (["active", "waiting", "delayed"].includes(state)) {
          this.logger.warn(
            `Job ${jobId} already in state ${state} — skipping enqueue`,
          );
          return Result.success();
        }
      }

      await this.queue.add("process", data, {
        jobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      });

      this.logger.log(`Enqueued job ${jobId} on example-queue`);
      return Result.success();
    } catch (error) {
      this.logger.error(`Failed to enqueue: ${(error as Error).message}`);
      return Result.fail(error as Error);
    }
  }
}
