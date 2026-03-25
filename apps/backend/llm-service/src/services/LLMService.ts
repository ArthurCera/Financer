import { injectable, inject } from 'tsyringe';
import type { ILLMService } from '@financer/backend-shared';
import type { CategorizeResponse, CategorizeBatchResult, ChatMessage, ChatHistoryResponse } from '@financer/shared';
import { CategorizationService } from './CategorizationService';
import { ChatService } from './ChatService';

/**
 * LLMService — Facade
 *
 * Implements ILLMService and delegates to focused services
 * (CategorizationService, ChatService).
 */
@injectable()
export class LLMService implements ILLMService {
  constructor(
    @inject('ICategorizationService') private readonly categorization: CategorizationService,
    @inject('IChatService') private readonly chatService: ChatService,
  ) {}

  async categorize(userId: string, expenseId: string): Promise<CategorizeResponse> {
    return this.categorization.categorize(userId, expenseId);
  }

  async categorizeBatchSync(userId: string, month: number, year: number, recategorizeAll?: boolean): Promise<CategorizeBatchResult> {
    return this.categorization.categorizeBatchSync(userId, month, year, recategorizeAll);
  }

  async chat(userId: string, message: string): Promise<ChatMessage> {
    return this.chatService.chat(userId, message);
  }

  async chatHistory(userId: string): Promise<ChatHistoryResponse> {
    return this.chatService.chatHistory(userId);
  }
}
