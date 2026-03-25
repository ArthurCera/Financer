import { LLMChatDto } from '../types';

/**
 * ILLMChatRepository
 *
 * Contract for chat message persistence.
 * Used by the LLM service's ChatService for message storage and history retrieval.
 */
export interface ILLMChatRepository {
  saveMessage(userId: string, role: 'user' | 'assistant', content: string): Promise<LLMChatDto>;
  getHistory(userId: string, limit?: number): Promise<LLMChatDto[]>;
}
