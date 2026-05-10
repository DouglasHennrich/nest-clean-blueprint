import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import { ILogger } from "@/@shared/classes/custom-logger";
import { Result } from "@/@shared/classes/result";
import {
  DEFAULT_CACHE_OPTIONS,
  ICacheOptions,
  TAbstractCache,
} from "../models/cache.struct";

/**
 * TDataCacheService — DI token for JSON data caching.
 *
 * Use this in services that need cache-aside pattern or simple
 * key-value storage (rate limits, distributed locks, etc.).
 */
export abstract class TDataCacheService extends TAbstractCache {}

@Injectable()
export class DataCacheService implements TDataCacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private logger: ILogger,
  ) {
    this.logger.setContextName(DataCacheService.name);
  }

  async get<T>(
    key: string,
    fetchFn: () => Promise<Result<T>>,
    options: ICacheOptions = DEFAULT_CACHE_OPTIONS,
  ): Promise<Result<T>> {
    try {
      const cached = await this.cacheManager.get<T>(key);
      if (cached !== undefined && cached !== null) {
        return Result.success(cached);
      }

      const result = await fetchFn();
      if (result.error) return result;

      const data = result.getValue()!;
      const ttl =
        options.shouldExpire === false ? undefined : (options.ttl ?? 3600);
      await this.cacheManager.set(key, data, ttl);
      return Result.success(data);
    } catch (err) {
      // Redis unavailable → fall through to data source (graceful degradation)
      this.logger.warn(
        `Cache miss (Redis error) for key "${key}": ${(err as Error).message}`,
      );
      return fetchFn();
    }
  }

  async set<T>(
    key: string,
    value: T,
    options: ICacheOptions = DEFAULT_CACHE_OPTIONS,
  ): Promise<void> {
    try {
      const ttl =
        options.shouldExpire === false ? undefined : (options.ttl ?? 3600);
      await this.cacheManager.set(key, value, ttl);
    } catch (err) {
      this.logger.warn(
        `Cache set failed for key "${key}": ${(err as Error).message}`,
      );
    }
  }

  async getSimple<T>(key: string): Promise<T | undefined> {
    try {
      const val = await this.cacheManager.get<T>(key);
      return val ?? undefined;
    } catch {
      return undefined;
    }
  }

  async setSimple<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttlSeconds);
    } catch (err) {
      this.logger.warn(
        `Cache setSimple failed for key "${key}": ${(err as Error).message}`,
      );
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (err) {
      this.logger.warn(
        `Cache delete failed for key "${key}": ${(err as Error).message}`,
      );
    }
  }

  async clear(): Promise<void> {
    try {
      await this.cacheManager.clear();
    } catch (err) {
      this.logger.warn(`Cache clear failed: ${(err as Error).message}`);
    }
  }
}
