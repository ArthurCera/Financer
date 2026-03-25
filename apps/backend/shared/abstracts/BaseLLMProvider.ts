import { ILLMProvider, LLMOptions } from '../interfaces/ILLMProvider';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/**
 * BaseLLMProvider
 *
 * Abstract base class for all LLM provider implementations.
 *
 * Concrete providers (e.g. OllamaProvider) extend this class and implement
 * the three abstract methods. All shared cross-cutting concerns live here:
 *
 *  - Retry with exponential backoff
 *  - Structured request logging
 *
 * This follows the Template Method pattern:
 *   BaseLLMProvider controls the algorithm structure,
 *   subclasses fill in the provider-specific steps.
 */
export abstract class BaseLLMProvider implements ILLMProvider {

  // ---------------------------------------------------------------------------
  // Abstract — must be implemented by each concrete provider
  // ---------------------------------------------------------------------------

  protected abstract executeComplete(prompt: string, options?: LLMOptions): Promise<string>;
  protected abstract executeEmbed(text: string): Promise<number[]>;
  abstract isAvailable(): Promise<boolean>;

  // ---------------------------------------------------------------------------
  // Public API — delegates to abstract methods with shared cross-cutting logic
  // ---------------------------------------------------------------------------

  async complete(prompt: string, options?: LLMOptions): Promise<string> {
    this.logRequest('complete', { promptLength: prompt.length, options });
    return this.withRetry(() => this.executeComplete(prompt, options));
  }

  async embed(text: string): Promise<number[]> {
    this.logRequest('embed', { textLength: text.length });
    const result = await this.withRetry(() => this.executeEmbed(text));
    if (result.length === 0) {
      throw new Error('Embedding model returned empty vector');
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Shared utilities
  // ---------------------------------------------------------------------------

  /**
   * Retry a function up to MAX_RETRIES times with exponential backoff.
   * Only retries on transient errors (network, timeout).
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

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

  private isTransientError(error: unknown): boolean {
    const err = error as { message?: string; code?: string; status?: number; statusCode?: number };
    const message = (err.message ?? '').toLowerCase();
    const code = (err.code ?? '').toUpperCase();
    const status = err.status ?? err.statusCode ?? 0;

    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('socket') ||
      ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH'].includes(code) ||
      [429, 503, 504].includes(status)
    );
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: object): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      provider: this.constructor.name,
      message,
      ...data,
    };
    console[level](JSON.stringify(entry));
  }

  private logRequest(operation: string, data: object): void {
    this.log('info', `LLM ${operation} request`, { operation, ...data });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
