"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseLLMProvider = void 0;
const types_1 = require("../types");
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
/** Max LLM calls per user per minute — enforced via Redis */
const RATE_LIMIT_PER_MINUTE = 20;
/**
 * BaseLLMProvider
 *
 * Abstract base class for all LLM provider implementations.
 *
 * Concrete providers (e.g. OllamaProvider) extend this class and implement
 * the three abstract methods. All shared cross-cutting concerns live here:
 *
 *  - Retry with exponential backoff
 *  - Per-user rate limiting via Redis
 *  - Structured request logging
 *
 * This follows the Template Method pattern:
 *   BaseLLMProvider controls the algorithm structure,
 *   subclasses fill in the provider-specific steps.
 */
class BaseLLMProvider {
    constructor(cache) {
        this.cache = cache;
    }
    // ---------------------------------------------------------------------------
    // Public API — delegates to abstract methods with shared cross-cutting logic
    // ---------------------------------------------------------------------------
    async complete(prompt, options) {
        this.logRequest('complete', { promptLength: prompt.length, options });
        return this.withRetry(() => this.executeComplete(prompt, options));
    }
    async embed(text) {
        this.logRequest('embed', { textLength: text.length });
        return this.withRetry(() => this.executeEmbed(text));
    }
    // ---------------------------------------------------------------------------
    // Shared utilities
    // ---------------------------------------------------------------------------
    /**
     * Check and increment the rate limit counter for a user.
     * Throws an AppError (429) if the limit is exceeded.
     */
    async checkRateLimit(userId) {
        const key = `rate_limit:llm:${userId}`;
        const count = await this.cache.increment(key, 60);
        if (count > RATE_LIMIT_PER_MINUTE) {
            throw new types_1.RateLimitError();
        }
    }
    /**
     * Retry a function up to MAX_RETRIES times with exponential backoff.
     * Only retries on transient errors (network, timeout).
     */
    async withRetry(fn) {
        let lastError;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                if (!this.isTransientError(lastError)) {
                    throw lastError;
                }
                if (attempt < MAX_RETRIES) {
                    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    this.log('warn', `Attempt ${attempt} failed, retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }
        throw lastError;
    }
    isTransientError(error) {
        const message = error.message.toLowerCase();
        return (message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnrefused') ||
            message.includes('socket'));
    }
    log(level, message, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            provider: this.constructor.name,
            message,
            ...data,
        };
        console[level](JSON.stringify(entry));
    }
    logRequest(operation, data) {
        this.log('info', `LLM ${operation} request`, { operation, ...data });
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.BaseLLMProvider = BaseLLMProvider;
//# sourceMappingURL=BaseLLMProvider.js.map