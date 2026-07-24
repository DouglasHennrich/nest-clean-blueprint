import { Queue, Job } from 'bullmq';
import { ExampleSchedulerService } from './example-scheduler.service';
import { ILogger } from '@/@shared/classes/custom-logger';

describe('ExampleSchedulerService', () => {
  let service: ExampleSchedulerService;
  let queue: jest.Mocked<Queue>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    queue = {
      getJob: jest.fn(),
      add: jest.fn(),
    } as unknown as jest.Mocked<Queue>;

    logger = {
      setContextName: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    service = new ExampleSchedulerService(queue, logger);
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('ExampleSchedulerService');
  });

  it('should enqueue a job using a derived jobId when no existing job is found', async () => {
    queue.getJob.mockResolvedValue(null as unknown as Job);
    queue.add.mockResolvedValue({} as Job);

    const result = await service.enqueue({ entityId: 'e1', payload: { a: 1 } });

    expect(queue.getJob).toHaveBeenCalledWith('example-e1');
    expect(queue.add).toHaveBeenCalledWith(
      'process',
      { entityId: 'e1', payload: { a: 1 } },
      {
        jobId: 'example-e1',
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    );
    expect(result.error).toBeUndefined();
  });

  it('should use the provided idempotencyKey as jobId', async () => {
    queue.getJob.mockResolvedValue(null as unknown as Job);
    queue.add.mockResolvedValue({} as Job);

    await service.enqueue({ entityId: 'e1', payload: {} }, 'custom-key');

    expect(queue.getJob).toHaveBeenCalledWith('custom-key');
    expect(queue.add).toHaveBeenCalledWith(
      'process',
      expect.anything(),
      expect.objectContaining({ jobId: 'custom-key' }),
    );
  });

  it('should skip enqueueing when an existing job is active/waiting/delayed', async () => {
    const existingJob = { getState: jest.fn().mockResolvedValue('active') } as unknown as Job;
    queue.getJob.mockResolvedValue(existingJob);

    const result = await service.enqueue({ entityId: 'e1', payload: {} });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('already in state active — skipping enqueue'),
    );
    expect(queue.add).not.toHaveBeenCalled();
    expect(result.error).toBeUndefined();
  });

  it('should enqueue anyway when an existing job is in a terminal state', async () => {
    const existingJob = { getState: jest.fn().mockResolvedValue('completed') } as unknown as Job;
    queue.getJob.mockResolvedValue(existingJob);
    queue.add.mockResolvedValue({} as Job);

    await service.enqueue({ entityId: 'e1', payload: {} });

    expect(queue.add).toHaveBeenCalled();
  });

  it('should return a failed Result when the queue throws', async () => {
    queue.getJob.mockRejectedValue(new Error('queue unreachable'));

    const result = await service.enqueue({ entityId: 'e1', payload: {} });

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('queue unreachable');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to enqueue: queue unreachable'),
    );
  });
});
