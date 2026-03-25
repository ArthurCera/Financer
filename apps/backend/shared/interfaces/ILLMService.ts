import type { CategorizeResponse, CategorizeBatchResult, ChatMessage, ChatHistoryResponse } from '@financer/shared';

/**
 * ILLMService
 *
 * Contract for the LLM facade service.
 */
export interface ILLMService {
  categorize(userId: string, expenseId: string): Promise<CategorizeResponse>;
  categorizeBatchSync(userId: string, month: number, year: number, recategorizeAll?: boolean): Promise<CategorizeBatchResult>;
  chat(userId: string, message: string): Promise<ChatMessage>;
  chatHistory(userId: string): Promise<ChatHistoryResponse>;
}
