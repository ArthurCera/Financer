"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgets = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const categories_schema_1 = require("./categories.schema");
const users_schema_1 = require("./users.schema");
exports.budgets = (0, pg_core_1.pgTable)('budgets', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    categoryId: (0, pg_core_1.uuid)('category_id').references(() => categories_schema_1.categories.id, { onDelete: 'set null' }),
    amount: (0, pg_core_1.numeric)('amount', { precision: 12, scale: 2 }).notNull(),
    month: (0, pg_core_1.integer)('month').notNull(),
    year: (0, pg_core_1.integer)('year').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=budgets.schema.js.map