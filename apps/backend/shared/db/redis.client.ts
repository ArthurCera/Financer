import { createClient, RedisClientType } from 'redis';

/**
 * Redis client — singleton instance.
 *
 * Microservices import `redisClient` and use it directly,
 * or inject it into a concrete ICacheService implementation.
 */

let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  const host = process.env.REDIS_HOST ?? 'localhost';
  const port = Number(process.env.REDIS_PORT ?? 6379);

  redisClient = createClient({
    socket: {
      host,
      port,
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error('[Redis] Max reconnection attempts reached.');
          return new Error('Redis max retries exceeded');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  }) as RedisClientType;

  redisClient.on('error', (err: Error) => {
    console.error('[Redis] Client error:', err.message);
  });

  redisClient.on('reconnecting', () => {
    console.warn('[Redis] Reconnecting...');
  });

  await redisClient.connect();
  console.info(`[Redis] Connected to ${host}:${port}`);

  return redisClient;
}

/** Gracefully close the Redis connection. Call on Lambda shutdown. */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
