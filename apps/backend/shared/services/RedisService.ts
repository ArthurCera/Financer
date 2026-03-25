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
    return JSON.parse(value) as T;
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
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const client = await getRedisClient();
    const count = await client.incr(key);
    // Set TTL only on first increment (count === 1) to avoid resetting the window
    if (count === 1 && ttlSeconds !== undefined) {
      await client.expire(key, ttlSeconds);
    }
    return count;
  }
}
