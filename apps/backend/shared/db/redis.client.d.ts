import { RedisClientType } from 'redis';
export declare function getRedisClient(): Promise<RedisClientType>;
/** Gracefully close the Redis connection. Call on Lambda shutdown. */
export declare function closeRedisClient(): Promise<void>;
//# sourceMappingURL=redis.client.d.ts.map