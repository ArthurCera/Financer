import { date, numeric, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { categories } from './categories.schema';
import { users } from './users.schema';

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }),
  date: date('date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ExpenseRow = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
