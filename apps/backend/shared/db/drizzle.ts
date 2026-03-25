/**
 * Re-export commonly used drizzle-orm query operators so that microservices
 * can import them from '@financer/backend-shared' without needing drizzle-orm
 * as a direct dependency.
 */
export { eq, and, or, gte, lte, gt, lt, isNull, isNotNull, sum, count, avg, inArray, desc, sql } from 'drizzle-orm';
