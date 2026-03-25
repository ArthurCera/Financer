/**
 * ICacheService
 *
 * Abstracts all cache operations. Concrete implementation uses Redis,
 * but any key-value store can be swapped in by implementing this interface.
 *
 * Used by:
 *  - dashboard-service: cache-aside pattern for aggregated data
 *  - llm-service: rate limiting counters per user
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  /**
   * Delete all keys matching a glob pattern (e.g. "dashboard:user:*").
   * Used for cache invalidation when underlying data changes.
   */
  deletePattern(pattern: string): Promise<void>;
  /**
   * Atomically increment a counter and return the new value.
   * Contract: if ttlSeconds is provided it MUST be applied on the first increment
   * (i.e. when the key does not yet exist) and left unchanged on subsequent calls.
   * Concrete implementations must honour this — Redis INCR does not set TTL by
   * default, so an explicit EXPIRE must follow when the return value is 1.
   */
  increment(key: string, ttlSeconds?: number): Promise<number>;

  /**
   * Sliding-window rate limiter backed by a sorted set.
   *
   * Atomically removes expired entries, adds the current request, counts
   * remaining entries, and sets an expiry on the key. Returns the current
   * request count within the window.
   *
   * @param key       Redis key (sorted set)
   * @param windowMs  Sliding window size in milliseconds
   * @param nowMs     Current timestamp in milliseconds (Date.now())
   * @param uniqueId  A unique identifier for this request (e.g. UUID or timestamp + random)
   */
  slidingWindowCount(key: string, windowMs: number, nowMs: number, uniqueId: string): Promise<number>;
}
