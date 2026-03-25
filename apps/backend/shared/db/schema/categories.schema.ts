import { boolean, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).notNull().default('#6B7280'),
  icon: varchar('icon', { length: 50 }).notNull().default('tag'),
  isDefault: boolean('is_default').notNull().default(false),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
