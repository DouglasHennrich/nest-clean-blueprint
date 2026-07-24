import Redis from 'ioredis';
import { TEnvService } from '@/modules/env/services/env.service';

export interface IRedisConnectionOptionsModel {
  host: string;
  port: number;
}

/**
 * Redis Connection Helper
 *
 * Centralizes Redis connection configuration for all modules:
 * - BullMQ (queues)
 * - Cache (keyv)
 * - PubSub (publisher/subscriber)
 */
export class RedisConnectionHelper {
  /**
   * Get Redis connection options from environment
   */
  static getConnectionOptions(envService: TEnvService): IRedisConnectionOptionsModel {
    const host = envService.get('REDIS_HOST');
    const port = envService.get('REDIS_PORT');

    if (!host || !port) {
      throw new Error('Missing required Redis environment variables: REDIS_HOST, REDIS_PORT');
    }

    return { host, port };
  }

  /**
   * Create BullMQ connection configuration
   * Used by: queues.module.ts
   */
  static createBullMQConnection(envService: TEnvService) {
    const { host, port } = this.getConnectionOptions(envService);

    return {
      host,
      port,
      maxRetriesPerRequest: null, // Avoid aborting long pipelines
      enableReadyCheck: true,
    };
  }

  /**
   * Create Cache connection configuration
   * Used by: cache.module.ts (with @keyv/redis)
   * @redis/client expects url format for password authentication
   */
  static createCacheConnection(envService: TEnvService) {
    const { host, port } = this.getConnectionOptions(envService);

    // @redis/client format - URL without password
    return {
      url: `redis://${host}:${port}`,
    };
  }

  /**
   * Create PubSub publisher connection
   * Used by: redis-pubsub.service.ts
   */
  static createPubSubPublisher(envService: TEnvService): Redis {
    const { host, port } = this.getConnectionOptions(envService);

    return new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }

  /**
   * Create PubSub subscriber connection
   * Used by: redis-pubsub.service.ts
   */
  static createPubSubSubscriber(envService: TEnvService): Redis {
    const { host, port } = this.getConnectionOptions(envService);

    return new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }

  /**
   * Create direct Redis client for operations requiring native Redis access
   * Used by: data-cache.service.ts (for SCAN operations)
   *
   * This provides a direct ioredis client that bypasses Keyv wrapper,
   * allowing native Redis commands like SCAN that aren't exposed through Keyv.
   */
  static createDirectRedisClient(envService: TEnvService): Redis {
    const { host, port } = this.getConnectionOptions(envService);

    return new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false, // Connect immediately
    });
  }
}
