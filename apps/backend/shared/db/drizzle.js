"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = exports.desc = exports.inArray = exports.avg = exports.count = exports.sum = exports.isNotNull = exports.isNull = exports.lt = exports.gt = exports.lte = exports.gte = exports.or = exports.and = exports.eq = void 0;
/**
 * Re-export commonly used drizzle-orm query operators so that microservices
 * can import them from '@financer/backend-shared' without needing drizzle-orm
 * as a direct dependency.
 */
var drizzle_orm_1 = require("drizzle-orm");
Object.defineProperty(exports, "eq", { enumerable: true, get: function () { return drizzle_orm_1.eq; } });
Object.defineProperty(exports, "and", { enumerable: true, get: function () { return drizzle_orm_1.and; } });
Object.defineProperty(exports, "or", { enumerable: true, get: function () { return drizzle_orm_1.or; } });
Object.defineProperty(exports, "gte", { enumerable: true, get: function () { return drizzle_orm_1.gte; } });
Object.defineProperty(exports, "lte", { enumerable: true, get: function () { return drizzle_orm_1.lte; } });
Object.defineProperty(exports, "gt", { enumerable: true, get: function () { return drizzle_orm_1.gt; } });
Object.defineProperty(exports, "lt", { enumerable: true, get: function () { return drizzle_orm_1.lt; } });
Object.defineProperty(exports, "isNull", { enumerable: true, get: function () { return drizzle_orm_1.isNull; } });
Object.defineProperty(exports, "isNotNull", { enumerable: true, get: function () { return drizzle_orm_1.isNotNull; } });
Object.defineProperty(exports, "sum", { enumerable: true, get: function () { return drizzle_orm_1.sum; } });
Object.defineProperty(exports, "count", { enumerable: true, get: function () { return drizzle_orm_1.count; } });
Object.defineProperty(exports, "avg", { enumerable: true, get: function () { return drizzle_orm_1.avg; } });
Object.defineProperty(exports, "inArray", { enumerable: true, get: function () { return drizzle_orm_1.inArray; } });
Object.defineProperty(exports, "desc", { enumerable: true, get: function () { return drizzle_orm_1.desc; } });
Object.defineProperty(exports, "sql", { enumerable: true, get: function () { return drizzle_orm_1.sql; } });
//# sourceMappingURL=drizzle.js.map