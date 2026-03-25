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
export declare class RedisService implements ICacheService {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<void>;
    deletePattern(pattern: string): Promise<void>;
    increment(key: string, ttlSeconds?: number): Promise<number>;
}
//# sourceMappingURL=RedisService.d.ts.map