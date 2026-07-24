import Redis from 'ioredis';
import { RedisConnectionHelper } from './redis-connection.helper';
import { TEnvService } from '@/modules/env/services/env.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation((options: unknown) => ({ __options: options }));
});

describe('RedisConnectionHelper', () => {
  let envService: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    envService = { get: jest.fn() };
  });

  const mockEnv = (host: string | undefined, port: number | undefined) => {
    envService.get.mockImplementation((key: string) => {
      if (key === 'REDIS_HOST') return host;
      if (key === 'REDIS_PORT') return port;
      return undefined;
    });
  };

  describe('getConnectionOptions', () => {
    it('should return host and port from env service', () => {
      mockEnv('localhost', 6379);

      const result = RedisConnectionHelper.getConnectionOptions(envService);

      expect(result).toEqual({ host: 'localhost', port: 6379 });
    });

    it('should throw when REDIS_HOST is missing', () => {
      mockEnv(undefined, 6379);

      expect(() =>
        RedisConnectionHelper.getConnectionOptions(envService as unknown as TEnvService),
      ).toThrow('Missing required Redis environment variables: REDIS_HOST, REDIS_PORT');
    });

    it('should throw when REDIS_PORT is missing', () => {
      mockEnv('localhost', undefined);

      expect(() =>
        RedisConnectionHelper.getConnectionOptions(envService as unknown as TEnvService),
      ).toThrow('Missing required Redis environment variables: REDIS_HOST, REDIS_PORT');
    });
  });

  describe('createBullMQConnection', () => {
    it('should build a BullMQ connection config with disabled maxRetriesPerRequest', () => {
      mockEnv('redis-host', 6380);

      const result = RedisConnectionHelper.createBullMQConnection(envService);

      expect(result).toEqual({
        host: 'redis-host',
        port: 6380,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });
    });
  });

  describe('createCacheConnection', () => {
    it('should build a redis:// url without credentials', () => {
      mockEnv('cache-host', 6381);

      const result = RedisConnectionHelper.createCacheConnection(envService);

      expect(result).toEqual({ url: 'redis://cache-host:6381' });
    });
  });

  describe('createPubSubPublisher', () => {
    it('should create a Redis instance with the resolved connection options', () => {
      mockEnv('pub-host', 6382);

      const client = RedisConnectionHelper.createPubSubPublisher(envService);

      expect(Redis).toHaveBeenCalledWith({
        host: 'pub-host',
        port: 6382,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });
      expect(client).toBeDefined();
    });
  });

  describe('createPubSubSubscriber', () => {
    it('should create a Redis instance with the resolved connection options', () => {
      mockEnv('sub-host', 6383);

      RedisConnectionHelper.createPubSubSubscriber(envService);

      expect(Redis).toHaveBeenCalledWith({
        host: 'sub-host',
        port: 6383,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      });
    });
  });

  describe('createDirectRedisClient', () => {
    it('should create a Redis instance with lazyConnect disabled (connect immediately)', () => {
      mockEnv('direct-host', 6384);

      RedisConnectionHelper.createDirectRedisClient(envService);

      expect(Redis).toHaveBeenCalledWith({
        host: 'direct-host',
        port: 6384,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: false,
      });
    });
  });
});
