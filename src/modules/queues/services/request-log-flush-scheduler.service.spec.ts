import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { RequestLogFlushSchedulerService } from './request-log-flush-scheduler.service';
import { ILogger } from '@/@shared/classes/custom-logger';
import { TEnvService } from '@/modules/env/services/env.service';

describe('RequestLogFlushSchedulerService', () => {
  let service: RequestLogFlushSchedulerService;
  let envService: jest.Mocked<TEnvService>;
  let redisClient: { llen: jest.Mock; rpush: jest.Mock };
  let queue: jest.Mocked<Queue>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    envService = {
      get: jest.fn().mockReturnValue(50),
    };

    redisClient = {
      llen: jest.fn(),
      rpush: jest.fn(),
    };

    queue = {
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

    service = new RequestLogFlushSchedulerService(
      envService,
      redisClient as unknown as Redis,
      queue,
      logger,
    );
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('RequestLogFlushSchedulerService');
  });

  describe('enqueue', () => {
    it('should serialize the payload and push it onto the Redis list', async () => {
      redisClient.rpush.mockResolvedValue(1);
      redisClient.llen.mockResolvedValue(1);
      envService.get.mockReturnValue(50);

      const payload = { method: 'GET', path: '/foo' };
      await service.enqueue(payload);

      expect(redisClient.rpush).toHaveBeenCalledWith(
        'pitanga:request-logs:pending',
        JSON.stringify(payload),
      );
    });

    it('should not trigger a flush job when the batch size threshold has not been reached', async () => {
      redisClient.rpush.mockResolvedValue(1);
      redisClient.llen.mockResolvedValue(10);
      envService.get.mockReturnValue(50);

      await service.enqueue({ method: 'GET', path: '/foo' });

      expect(queue.add).not.toHaveBeenCalled();
    });

    it('should trigger a flush job when the batch size threshold is reached', async () => {
      redisClient.rpush.mockResolvedValue(1);
      redisClient.llen.mockResolvedValue(50);
      envService.get.mockReturnValue(50);
      queue.add.mockResolvedValue({} as any);

      await service.enqueue({ method: 'GET', path: '/foo' });

      expect(queue.add).toHaveBeenCalledWith('flush', {}, expect.any(Object));
    });

    it('should trigger a flush job when the batch size threshold is exceeded', async () => {
      redisClient.rpush.mockResolvedValue(1);
      redisClient.llen.mockResolvedValue(51);
      envService.get.mockReturnValue(50);
      queue.add.mockResolvedValue({} as any);

      await service.enqueue({ method: 'GET', path: '/foo' });

      expect(queue.add).toHaveBeenCalledWith('flush', {}, expect.any(Object));
    });

    it('should log (not throw) when Redis rpush fails', async () => {
      redisClient.rpush.mockRejectedValue(new Error('redis down'));

      await expect(service.enqueue({ method: 'GET', path: '/foo' })).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to enqueue request log: redis down'),
      );
      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('triggerManualFlush', () => {
    it('should enqueue a flush job and return a success Result', async () => {
      queue.add.mockResolvedValue({} as any);

      const result = await service.triggerManualFlush();

      expect(queue.add).toHaveBeenCalledWith(
        'flush',
        {},
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 50 },
          removeOnFail: { count: 100 },
        }),
      );
      expect(result.error).toBeUndefined();
    });

    it('should use a jobId prefixed with "flush-"', async () => {
      queue.add.mockResolvedValue({} as any);

      await service.triggerManualFlush();

      const [, , options] = queue.add.mock.calls[0];
      expect((options as { jobId: string }).jobId).toMatch(/^flush-\d+$/);
    });

    it('should return a failed Result and log when the queue throws', async () => {
      queue.add.mockRejectedValue(new Error('queue down'));

      const result = await service.triggerManualFlush();

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('queue down');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to trigger manual flush: queue down'),
      );
    });
  });

  describe('scheduledFlush', () => {
    it('should trigger a flush job when the Redis list has pending items', async () => {
      redisClient.llen.mockResolvedValue(5);
      queue.add.mockResolvedValue({} as any);

      await service.scheduledFlush();

      expect(redisClient.llen).toHaveBeenCalledWith('pitanga:request-logs:pending');
      expect(queue.add).toHaveBeenCalledWith('flush', {}, expect.any(Object));
    });

    it('should not trigger a flush job when the Redis list is empty', async () => {
      redisClient.llen.mockResolvedValue(0);

      await service.scheduledFlush();

      expect(queue.add).not.toHaveBeenCalled();
    });

    it('should log (not throw) when checking the Redis list length fails', async () => {
      redisClient.llen.mockRejectedValue(new Error('redis unreachable'));

      await expect(service.scheduledFlush()).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled flush failed: redis unreachable'),
      );
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('should log (not throw) when triggering the flush job fails', async () => {
      redisClient.llen.mockResolvedValue(3);
      queue.add.mockRejectedValue(new Error('enqueue failed'));

      await expect(service.scheduledFlush()).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled flush failed: enqueue failed'),
      );
    });
  });
});
