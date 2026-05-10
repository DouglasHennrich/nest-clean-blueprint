import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Job } from "bullmq";
import { ILogger } from "@/@shared/classes/custom-logger";
import { IExampleJobData } from "../dto/example-job.dto";

/**
 * ExampleProcessor
 *
 * Processes jobs from 'example-queue'. Replace the process() stub
 * with your actual business logic when implementing real queues.
 *
 * - Throws Error → BullMQ retries (up to attempts configured in scheduler)
 * - Throws UnrecoverableError → job permanently fails, no more retries
 */
@Processor("example-queue", { concurrency: 5 })
@Injectable()
export class ExampleProcessor extends WorkerHost {
  constructor(public readonly logger: ILogger) {
    super();
    this.logger.setContextName(ExampleProcessor.name);
  }

  async process(job: Job<IExampleJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id}: entityId=${job.data.entityId}`);

    try {
      // TODO: inject your domain service and call it here
      // const result = await this.exampleService.execute(job.data);
      // if (result.error) throw result.error;

      this.logger.log(`Job ${job.id} completed`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Job ${job.id} failed: ${err.message}`);

      // Re-throw to trigger BullMQ retry
      throw err;
    }
  }
}
