import { integer, numeric, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { categories } from './categories.schema';
import { users } from './users.schema';

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type BudgetRow = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
