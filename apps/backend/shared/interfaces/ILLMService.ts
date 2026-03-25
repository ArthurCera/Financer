import type { CategorizeResponse, ChatMessage, ChatHistoryResponse } from '@financer/shared';

/**
 * ILLMService
 *
 * Contract for the LLM facade service.
 * ChatStreamServer and QueueWorker depend on this abstraction,
 * not on the concrete LLMService class.
 */
export interface ILLMService {
  // Categorization
  categorize(userId: string, expenseId: string): Promise<CategorizeResponse>;
  categorizeBatch(userId: string, month: number, year: number): Promise<void>;
  startBatchWorker(): Promise<void>;

  // Chat
  queueChat(jobId: string, userId: string, message: string): Promise<void>;
  chat(userId: string, message: string): Promise<ChatMessage>;
  chatHistory(userId: string): Promise<ChatHistoryResponse>;
  startChatWorker(): Promise<void>;

  // Streaming helpers (used by ChatStreamServer)
  buildChatContext(userId: string, message: string): Promise<{ prompt: string; systemPrompt: string; embedding: number[] | null }>;
  saveUserMessage(userId: string, message: string, cachedEmbedding?: number[] | null): Promise<{ id: string }>;
  saveAssistantMessage(userId: string, content: string): Promise<{ id: string; createdAt: Date }>;
}
