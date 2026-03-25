/**
 * ILLMProvider
 *
 * Core abstraction for all LLM interactions.
 *
 * OllamaProvider is the only concrete implementation, but the entire
 * llm-service is written against this interface — switching to OpenAI,
 * Anthropic, or any other provider requires only a new implementation file.
 *
 * All implementations MUST extend BaseLLMProvider to inherit:
 *   - Retry logic with exponential backoff
 *   - Structured request/response logging
 */
export interface ILLMProvider {
  /**
   * Generate a text completion from a prompt.
   * @param prompt - The user/system prompt
   * @param options - Optional generation parameters
   */
  complete(prompt: string, options?: LLMOptions): Promise<string>;

  /**
   * Generate a vector embedding for the given text.
   * Used for semantic search and vector DB storage.
   */
  embed(text: string): Promise<number[]>;

  /**
   * Check whether the LLM backend is reachable and ready.
   */
  isAvailable(): Promise<boolean>;
}

export interface LLMOptions {
  /** Sampling temperature (0.0–1.0). Default: 0.7 */
  temperature?: number;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** System-level instruction prepended to the conversation */
  systemPrompt?: string;
  /** Force output format (e.g. 'json'). Only use when the model reliably outputs the format. */
  format?: 'json';
  /** Disable model thinking/reasoning (e.g. qwen3.5 <think> blocks). Default: true */
  think?: boolean;
}
