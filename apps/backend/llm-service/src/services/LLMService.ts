import { injectable, inject } from 'tsyringe';
import type { ILLMService } from '@financer/backend-shared';
import type { CategorizeResponse, ChatMessage, ChatHistoryResponse } from '@financer/shared';
import { CategorizationService } from './CategorizationService';
import { ChatService } from './ChatService';

/**
 * LLMService — Facade
 *
 * Implements ILLMService and delegates to focused services
 * (CategorizationService, ChatService).
 * Consumers (ChatStreamServer, QueueWorker) depend on the ILLMService
 * interface, not this concrete class.
 */
@injectable()
export class LLMService implements ILLMService {
  constructor(
    @inject('ICategorizationService') private readonly categorization: CategorizationService,
    @inject('IChatService') private readonly chatService: ChatService,
  ) {}

  // --- Categorization ---

  async categorize(userId: string, expenseId: string): Promise<CategorizeResponse> {
    return this.categorization.categorize(userId, expenseId);
  }

  async categorizeBatch(userId: string, month: number, year: number): Promise<void> {
    return this.categorization.categorizeBatch(userId, month, year);
  }

  async startBatchWorker(): Promise<void> {
    return this.categorization.startBatchWorker();
  }

  // --- Chat ---

  async queueChat(jobId: string, userId: string, message: string): Promise<void> {
    return this.chatService.queueChat(jobId, userId, message);
  }

  async chat(userId: string, message: string): Promise<ChatMessage> {
    return this.chatService.chat(userId, message);
  }

  async chatHistory(userId: string): Promise<ChatHistoryResponse> {
    return this.chatService.chatHistory(userId);
  }

  async startChatWorker(): Promise<void> {
    return this.chatService.startChatWorker();
  }

  // --- Public helpers (used by ChatStreamServer) ---

  async buildChatContext(userId: string, message: string): Promise<{ prompt: string; systemPrompt: string; embedding: number[] | null }> {
    return this.chatService.buildChatContext(userId, message);
  }

  async saveUserMessage(userId: string, message: string, cachedEmbedding?: number[] | null): Promise<{ id: string }> {
    return this.chatService.saveUserMessage(userId, message, cachedEmbedding);
  }

  async saveAssistantMessage(userId: string, content: string): Promise<{ id: string; createdAt: Date }> {
    return this.chatService.saveAssistantMessage(userId, content);
  }
}
