"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthPeriodDates = getMonthPeriodDates;
/**
 * Calculate the start and end date strings for a given month period.
 * Returns ISO date strings (YYYY-MM-DD) suitable for database queries.
 */
function getMonthPeriodDates(month, year) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`;
    return { start, end };
}
//# sourceMappingURL=date.js.map