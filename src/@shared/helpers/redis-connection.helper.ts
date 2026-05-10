import { TEnvService } from "@/modules/env/services/env.service";

/**
 * RedisConnectionHelper
 *
 * Centralizes Redis connection config for BullMQ (ioredis format) and
 * Cache (@keyv/redis URL format). Both require different connection shapes.
 */
export class RedisConnectionHelper {
  /**
   * For BullMQ — uses ioredis ConnectionOptions.
   * IMPORTANT: maxRetriesPerRequest MUST be null for BullMQ.
   */
  static createBullMQConnection(env: TEnvService) {
    const password = env.get("REDIS_PASSWORD");
    return {
      host: env.get("REDIS_HOST"),
      port: env.get("REDIS_PORT"),
      ...(password ? { password } : {}),
      tls: env.get("REDIS_TLS") ? {} : undefined,
      maxRetriesPerRequest: null, // REQUIRED by BullMQ — do not remove
    };
  }

  /**
   * For @keyv/redis — expects a Redis URL string.
   */
  static createCacheRedisUrl(env: TEnvService): string {
    const password = env.get("REDIS_PASSWORD");
    const host = env.get("REDIS_HOST");
    const port = env.get("REDIS_PORT");
    const auth = password ? `:${password}@` : "";
    return `redis://${auth}${host}:${port}`;
  }
}
