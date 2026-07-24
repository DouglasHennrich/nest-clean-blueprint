import { CleanupExpiredRecordsCronService } from './cleanup-expired-records-cron.service';
import { ILogger } from '@/@shared/classes/custom-logger';
import { TDataCacheService } from '@/@shared/modules/cache/services/data-cache.service';

describe('CleanupExpiredRecordsCronService', () => {
  let service: CleanupExpiredRecordsCronService;
  let cacheService: jest.Mocked<TDataCacheService>;
  let logger: jest.Mocked<ILogger>;

  beforeEach(() => {
    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      getSimple: jest.fn(),
      setSimple: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };

    logger = {
      setContextName: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    service = new CleanupExpiredRecordsCronService(cacheService, logger);
  });

  it('should set the logger context name on construction', () => {
    expect(logger.setContextName).toHaveBeenCalledWith('CleanupExpiredRecordsCronService');
  });

  it('should acquire the lock, run cleanup, and release the lock', async () => {
    cacheService.getSimple.mockResolvedValue(undefined);
    cacheService.setSimple.mockResolvedValue(undefined);
    cacheService.delete.mockResolvedValue(undefined);

    await service.handleCleanup();

    expect(cacheService.getSimple).toHaveBeenCalledWith('cron:lock:cleanup-expired');
    expect(cacheService.setSimple).toHaveBeenCalledWith(
      'cron:lock:cleanup-expired',
      'locked',
      5 * 60,
    );
    expect(logger.log).toHaveBeenCalledWith('Starting cleanup of expired records');
    expect(logger.log).toHaveBeenCalledWith('Cleanup of expired records completed');
    expect(cacheService.delete).toHaveBeenCalledWith('cron:lock:cleanup-expired');
  });

  it('should skip the run and warn when the lock is already held', async () => {
    cacheService.getSimple.mockResolvedValue('locked');

    await service.handleCleanup();

    expect(logger.warn).toHaveBeenCalledWith('Cleanup lock already held — skipping this run');
    expect(cacheService.setSimple).not.toHaveBeenCalled();
    expect(cacheService.delete).not.toHaveBeenCalled();
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('should release the lock even when cleanup fails, and log the error', async () => {
    cacheService.getSimple.mockResolvedValue(undefined);
    cacheService.setSimple.mockResolvedValue(undefined);
    cacheService.delete.mockResolvedValue(undefined);

    // Force the try block to throw by making the "completed" log call blow up.
    logger.log.mockImplementation((message: string) => {
      if (message === 'Cleanup of expired records completed') {
        throw new Error('cleanup exploded');
      }
    });

    await service.handleCleanup();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Cleanup failed: cleanup exploded'),
    );
    expect(cacheService.delete).toHaveBeenCalledWith('cron:lock:cleanup-expired');
  });
});
