"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenses = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const categories_schema_1 = require("./categories.schema");
const users_schema_1 = require("./users.schema");
exports.expenses = (0, pg_core_1.pgTable)('expenses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    categoryId: (0, pg_core_1.uuid)('category_id').references(() => categories_schema_1.categories.id, { onDelete: 'set null' }),
    amount: (0, pg_core_1.numeric)('amount', { precision: 12, scale: 2 }).notNull(),
    description: (0, pg_core_1.varchar)('description', { length: 500 }),
    date: (0, pg_core_1.date)('date').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=expenses.schema.js.map