import { Cache } from 'cache-manager';
import { Result } from '@/@shared/classes/result';
import { DefaultException } from '@/@shared/errors/abstract-application-exception';
import { ILogger } from '@/@shared/classes/custom-logger';
import { DataCacheService } from './data-cache.service';

describe('DataCacheService', () => {
  let cacheManager: jest.Mocked<Cache>;
  let logger: jest.Mocked<ILogger>;
  let service: DataCacheService;

  beforeEach(() => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<Cache>;

    logger = {
      setContextName: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    service = new DataCacheService(cacheManager, logger);
  });

  describe('get', () => {
    it('should return the cached value without calling fetchFn on cache hit', async () => {
      cacheManager.get.mockResolvedValue('cached-value');
      const fetchFn = jest.fn();

      const result = await service.get('key', fetchFn);

      expect(result.getValue()).toBe('cached-value');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should call fetchFn, cache the result and return it on cache miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      const fetchFn = jest.fn().mockResolvedValue(Result.success('fresh-value'));

      const result = await service.get('key', fetchFn);

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(cacheManager.set).toHaveBeenCalledWith('key', 'fresh-value', 3600);
      expect(result.getValue()).toBe('fresh-value');
    });

    it('should treat a null cached value as a miss', async () => {
      cacheManager.get.mockResolvedValue(null);
      const fetchFn = jest.fn().mockResolvedValue(Result.success('fresh-value'));

      const result = await service.get('key', fetchFn);

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result.getValue()).toBe('fresh-value');
    });

    it('should not cache and should propagate the error when fetchFn fails', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      const error = new DefaultException('boom');
      const fetchFn = jest.fn().mockResolvedValue(Result.fail(error));

      const result = await service.get('key', fetchFn);

      expect(result.error).toBe(error);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should use undefined ttl when shouldExpire is false', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      const fetchFn = jest.fn().mockResolvedValue(Result.success('v'));

      await service.get('key', fetchFn, { shouldExpire: false });

      expect(cacheManager.set).toHaveBeenCalledWith('key', 'v', undefined);
    });

    it('should fall back to fetchFn and log a warning when the cache store throws', async () => {
      cacheManager.get.mockRejectedValue(new Error('Redis down'));
      const fetchFn = jest.fn().mockResolvedValue(Result.success('fallback-value'));

      const result = await service.get('key', fetchFn);

      expect(result.getValue()).toBe('fallback-value');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Cache miss (Redis error) for key "key"'),
      );
    });
  });

  describe('set', () => {
    it('should store the value with the default ttl', async () => {
      await service.set('key', { a: 1 });

      expect(cacheManager.set).toHaveBeenCalledWith('key', { a: 1 }, 3600);
    });

    it('should store the value with a custom ttl', async () => {
      await service.set('key', 'value', { ttl: 60 });

      expect(cacheManager.set).toHaveBeenCalledWith('key', 'value', 60);
    });

    it('should store the value without ttl when shouldExpire is false', async () => {
      await service.set('key', 'value', { shouldExpire: false });

      expect(cacheManager.set).toHaveBeenCalledWith('key', 'value', undefined);
    });

    it('should swallow errors and log a warning', async () => {
      cacheManager.set.mockRejectedValue(new Error('set failed'));

      await expect(service.set('key', 'value')).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Cache set failed'));
    });
  });

  describe('getSimple', () => {
    it('should return the cached value', async () => {
      cacheManager.get.mockResolvedValue('simple-value');

      const result = await service.getSimple('key');

      expect(result).toBe('simple-value');
    });

    it('should return undefined when the cache returns null', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.getSimple('key');

      expect(result).toBeUndefined();
    });

    it('should return undefined when the cache store throws', async () => {
      cacheManager.get.mockRejectedValue(new Error('boom'));

      const result = await service.getSimple('key');

      expect(result).toBeUndefined();
    });
  });

  describe('setSimple', () => {
    it('should store the value with the given ttl', async () => {
      await service.setSimple('key', 'value', 120);

      expect(cacheManager.set).toHaveBeenCalledWith('key', 'value', 120);
    });

    it('should swallow errors and log a warning', async () => {
      cacheManager.set.mockRejectedValue(new Error('failed'));

      await expect(service.setSimple('key', 'value')).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Cache setSimple failed'));
    });
  });

  describe('delete', () => {
    it('should delete the key', async () => {
      await service.delete('key');

      expect(cacheManager.del).toHaveBeenCalledWith('key');
    });

    it('should swallow errors and log a warning', async () => {
      cacheManager.del.mockRejectedValue(new Error('failed'));

      await expect(service.delete('key')).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Cache delete failed'));
    });
  });

  describe('clear', () => {
    it('should clear the cache', async () => {
      await service.clear();

      expect(cacheManager.clear).toHaveBeenCalled();
    });

    it('should swallow errors and log a warning', async () => {
      cacheManager.clear.mockRejectedValue(new Error('failed'));

      await expect(service.clear()).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Cache clear failed'));
    });
  });
});
