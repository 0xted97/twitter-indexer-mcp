import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pool: pg.Pool | null = null;

export function getDb() {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required');

    pool = new pg.Pool({ connectionString: databaseUrl });
    db = drizzle(pool, { schema });
  }
  return db;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
