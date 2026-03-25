/** Drizzle ORM instance — use this in all repositories */
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<Record<string, never>>;
/**
 * Verify the database connection on startup.
 * Call this in each Lambda cold-start handler.
 */
export declare function verifyDatabaseConnection(): Promise<void>;
//# sourceMappingURL=postgres.client.d.ts.map