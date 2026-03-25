"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const tsyringe_1 = require("tsyringe");
const redis_client_1 = require("../db/redis.client");
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
let RedisService = class RedisService {
    async get(key) {
        const client = await (0, redis_client_1.getRedisClient)();
        const value = await client.get(key);
        if (value === null)
            return null;
        return JSON.parse(value);
    }
    async set(key, value, ttlSeconds) {
        const client = await (0, redis_client_1.getRedisClient)();
        const serialized = JSON.stringify(value);
        if (ttlSeconds !== undefined) {
            await client.set(key, serialized, { EX: ttlSeconds });
        }
        else {
            await client.set(key, serialized);
        }
    }
    async delete(key) {
        const client = await (0, redis_client_1.getRedisClient)();
        await client.del(key);
    }
    async deletePattern(pattern) {
        const client = await (0, redis_client_1.getRedisClient)();
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
        }
    }
    async increment(key, ttlSeconds) {
        const client = await (0, redis_client_1.getRedisClient)();
        const count = await client.incr(key);
        // Set TTL only on first increment (count === 1) to avoid resetting the window
        if (count === 1 && ttlSeconds !== undefined) {
            await client.expire(key, ttlSeconds);
        }
        return count;
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, tsyringe_1.injectable)()
], RedisService);
//# sourceMappingURL=RedisService.js.map