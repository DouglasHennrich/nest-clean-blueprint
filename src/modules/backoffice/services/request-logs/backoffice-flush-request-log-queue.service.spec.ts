import { BackofficeFlushRequestLogQueueService } from './backoffice-flush-request-log-queue.service';
import { Result } from '@/@shared/classes/result';

describe('BackofficeFlushRequestLogQueueService', () => {
  let service: BackofficeFlushRequestLogQueueService;
  let requestLogFlushSchedulerService: { triggerManualFlush: jest.Mock };
  let logger: { setContextName: jest.Mock; log: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    requestLogFlushSchedulerService = { triggerManualFlush: jest.fn() };
    logger = { setContextName: jest.fn(), log: jest.fn(), error: jest.fn() };

    service = new BackofficeFlushRequestLogQueueService(
      requestLogFlushSchedulerService as any,
      logger as any,
    );
  });

  it('should set the logger context name', () => {
    expect(logger.setContextName).toHaveBeenCalledWith(BackofficeFlushRequestLogQueueService.name);
  });

  it('should trigger the manual flush and succeed', async () => {
    requestLogFlushSchedulerService.triggerManualFlush.mockResolvedValue(Result.success());

    const result = await service.execute();

    expect(requestLogFlushSchedulerService.triggerManualFlush).toHaveBeenCalled();
    expect(result.error).toBeUndefined();
    expect(logger.log).toHaveBeenCalledWith('Manual request-log-flush job triggered successfully');
  });

  it('should log and fail when the scheduler returns an error', async () => {
    const error = new Error('flush failed');
    requestLogFlushSchedulerService.triggerManualFlush.mockResolvedValue(Result.fail(error));

    const result = await service.execute();

    expect(result.error).toBe(error);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('flush failed'));
  });
});
