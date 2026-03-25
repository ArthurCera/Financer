import { injectable } from 'tsyringe';
import { getRedisClient } from '../db/redis.client';
import { ICacheService } from '../interfaces/ICacheService';

/**
 * RedisService
 *
 * Concrete implementation of ICacheService backed by Redis.
 * Shared across all microservices that need caching or rate limiting.
 *
 * Contract for increment():
 *  - On first call (key does not exist), the TTL is set.
 *  - On subsequent calls, the TTL is left unchanged (counter keeps ticking).
 */
@injectable()
export class RedisService implements ICacheService {
  async get<T>(key: string): Promise<T | null> {
    const client = await getRedisClient();
    const value = await client.get(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      console.error(`[Cache] Corrupt value for key "${key}" — deleting`);
      await client.del(key);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const client = await getRedisClient();
    const serialized = JSON.stringify(value);
    if (ttlSeconds !== undefined) {
      await client.set(key, serialized, { EX: ttlSeconds });
    } else {
      await client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    const client = await getRedisClient();
    await client.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const client = await getRedisClient();
    let cursor = 0;
    do {
      const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys.length > 0) {
        await client.del(result.keys);
      }
    } while (cursor !== 0);
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const client = await getRedisClient();
    if (ttlSeconds !== undefined) {
      // Atomic INCR + conditional EXPIRE via Lua to prevent race conditions
      const script = `
        local count = redis.call('INCR', KEYS[1])
        if count == 1 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        return count
      `;
      return await client.eval(script, { keys: [key], arguments: [String(ttlSeconds)] }) as number;
    }
    return await client.incr(key);
  }

  async slidingWindowCount(
    key: string,
    windowMs: number,
    nowMs: number,
    uniqueId: string,
  ): Promise<number> {
    const client = await getRedisClient();
    // Atomic sliding-window rate limit via Lua:
    // 1. Remove all entries older than the window (ZREMRANGEBYSCORE is atomic)
    // 2. Add the current request scored by timestamp
    // 3. Count remaining entries
    // 4. Set key expiry to window size (ceiling seconds) as a safety net
    const script = `
      redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
      redis.call('ZADD', KEYS[1], ARGV[2], ARGV[3])
      local count = redis.call('ZCARD', KEYS[1])
      redis.call('EXPIRE', KEYS[1], ARGV[4])
      return count
    `;
    const windowStart = String(nowMs - windowMs);
    const ttlSeconds = String(Math.ceil(windowMs / 1000));
    return await client.eval(script, {
      keys: [key],
      arguments: [windowStart, String(nowMs), uniqueId, ttlSeconds],
    }) as number;
  }
}
