import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

/** Typed Drizzle database instance — use this type in all repository constructors */
export type DrizzleDB = NodePgDatabase;

/**
 * PostgreSQL client — singleton Drizzle instance.
 *
 * All microservices import `db` from this module.
 * Connection parameters are read from environment variables — never hardcoded.
 */

function createPool(): Pool {
  const required = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const port = parseInt(process.env.POSTGRES_PORT!, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid POSTGRES_PORT: ${process.env.POSTGRES_PORT}`);
  }

  return new Pool({
    host: process.env.POSTGRES_HOST,
    port,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    max: Math.max(1, Math.min(100, parseInt(process.env.PG_POOL_MAX ?? '10', 10) || 10)),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

const pool = createPool();

/** Drizzle ORM instance — use this in all repositories */
export const db: DrizzleDB = drizzle(pool);

/**
 * Verify the database connection on startup.
 * Call this in each Lambda cold-start handler.
 */
export async function verifyDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}
