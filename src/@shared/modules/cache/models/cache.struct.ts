import { Result } from "@/@shared/classes/result";

export interface ICacheOptions {
  /** TTL in seconds. Default: 3600 */
  ttl?: number;
  /** If false, key never expires. Default: true */
  shouldExpire?: boolean;
}

export const DEFAULT_CACHE_OPTIONS: Required<ICacheOptions> = {
  ttl: 3600,
  shouldExpire: true,
};

/**
 * TAbstractCache — DI token for cache services.
 *
 * Provides cache-aside pattern (get with fetchFn fallback) and simple
 * get/set operations for use cases like rate-limit counters and locks.
 */
export abstract class TAbstractCache {
  /**
   * Cache-aside: returns cached value or calls fetchFn, caches and returns result.
   */
  abstract get<T>(
    key: string,
    fetchFn: () => Promise<Result<T>>,
    options?: ICacheOptions,
  ): Promise<Result<T>>;

  abstract set<T>(
    key: string,
    value: T,
    options?: ICacheOptions,
  ): Promise<void>;

  /** Simple get without Result wrapper — for counters and locks. */
  abstract getSimple<T>(key: string): Promise<T | undefined>;

  /** Simple set without Result wrapper — for counters and locks. */
  abstract setSimple<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<void>;

  abstract delete(key: string): Promise<void>;
  abstract clear(): Promise<void>;
}
