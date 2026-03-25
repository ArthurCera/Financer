import { ILLMProvider, LLMOptions } from '../interfaces/ILLMProvider';
import { ICacheService } from '../interfaces/ICacheService';
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
export declare abstract class BaseLLMProvider implements ILLMProvider {
    private readonly cache;
    constructor(cache: ICacheService);
    protected abstract executeComplete(prompt: string, options?: LLMOptions): Promise<string>;
    protected abstract executeEmbed(text: string): Promise<number[]>;
    abstract isAvailable(): Promise<boolean>;
    complete(prompt: string, options?: LLMOptions): Promise<string>;
    embed(text: string): Promise<number[]>;
    /**
     * Check and increment the rate limit counter for a user.
     * Throws an AppError (429) if the limit is exceeded.
     */
    protected checkRateLimit(userId: string): Promise<void>;
    /**
     * Retry a function up to MAX_RETRIES times with exponential backoff.
     * Only retries on transient errors (network, timeout).
     */
    private withRetry;
    private isTransientError;
    private log;
    private logRequest;
    private sleep;
}
//# sourceMappingURL=BaseLLMProvider.d.ts.map