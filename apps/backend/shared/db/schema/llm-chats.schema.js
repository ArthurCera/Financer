"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmChats = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
exports.llmChats = (0, pg_core_1.pgTable)('llm_chats', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    role: (0, pg_core_1.text)('role').notNull(), // 'user' | 'assistant'
    content: (0, pg_core_1.text)('content').notNull(),
    // Embedding stored/queried via raw SQL with ::vector cast — text passthrough avoids drizzle pgvector issues
    embedding: (0, pg_core_1.text)('embedding'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=llm-chats.schema.js.map