import { injectable, inject } from 'tsyringe';
import { LLMChatDto, llmChats, LLMChatRow, eq, desc } from '@financer/backend-shared';

@injectable()
export class LLMChatRepository {
  constructor(@inject('db') private readonly db: any) {}

  async saveMessage(userId: string, role: 'user' | 'assistant', content: string): Promise<LLMChatDto> {
    const rows = await this.db
      .insert(llmChats)
      .values({ userId, role, content })
      .returning();
    return this.rowToDto(rows[0] as LLMChatRow);
  }

  async getHistory(userId: string, limit = 50): Promise<LLMChatDto[]> {
    const rows = await this.db
      .select()
      .from(llmChats)
      .where(eq(llmChats.userId, userId))
      .orderBy(desc(llmChats.createdAt))
      .limit(limit);
    // Reverse so oldest first in the returned array
    return (rows as LLMChatRow[]).map((row) => this.rowToDto(row)).reverse();
  }

  private rowToDto(row: LLMChatRow): LLMChatDto {
    return {
      id: row.id,
      userId: row.userId,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      createdAt: row.createdAt,
    };
  }
}
