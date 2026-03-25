import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const llmChats = pgTable('llm_chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  // Embedding stored/queried via raw SQL with ::vector cast — text passthrough avoids drizzle pgvector issues
  embedding: text('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type LLMChatRow = typeof llmChats.$inferSelect;
export type NewLLMChat = typeof llmChats.$inferInsert;
