"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incomes = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
exports.incomes = (0, pg_core_1.pgTable)('incomes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    amount: (0, pg_core_1.numeric)('amount', { precision: 12, scale: 2 }).notNull(),
    description: (0, pg_core_1.varchar)('description', { length: 500 }),
    source: (0, pg_core_1.varchar)('source', { length: 255 }),
    date: (0, pg_core_1.date)('date').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
//# sourceMappingURL=incomes.schema.js.map