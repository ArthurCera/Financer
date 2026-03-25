"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.closeRedisClient = closeRedisClient;
const redis_1 = require("redis");
/**
 * Redis client — singleton instance.
 *
 * Microservices import `redisClient` and use it directly,
 * or inject it into a concrete ICacheService implementation.
 */
let redisClient = null;
async function getRedisClient() {
    if (redisClient) {
        return redisClient;
    }
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT ?? 6379);
    redisClient = (0, redis_1.createClient)({
        socket: {
            host,
            port,
            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    console.error('[Redis] Max reconnection attempts reached.');
                    return new Error('Redis max retries exceeded');
                }
                return Math.min(retries * 100, 3000);
            },
        },
    });
    redisClient.on('error', (err) => {
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
async function closeRedisClient() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
//# sourceMappingURL=redis.client.js.map