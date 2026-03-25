"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.verifyDatabaseConnection = verifyDatabaseConnection;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
/**
 * PostgreSQL client — singleton Drizzle instance.
 *
 * All microservices import `db` from this module.
 * Connection parameters are read from environment variables — never hardcoded.
 */
function createPool() {
    const required = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
    for (const key of required) {
        if (!process.env[key]) {
            throw new Error(`Missing required environment variable: ${key}`);
        }
    }
    return new pg_1.Pool({
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT),
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });
}
const pool = createPool();
/** Drizzle ORM instance — use this in all repositories */
exports.db = (0, node_postgres_1.drizzle)(pool);
/**
 * Verify the database connection on startup.
 * Call this in each Lambda cold-start handler.
 */
async function verifyDatabaseConnection() {
    const client = await pool.connect();
    try {
        await client.query('SELECT 1');
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=postgres.client.js.map