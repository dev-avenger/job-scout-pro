import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index.js';

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(connectionString?: string) {
  const url = connectionString || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const client = postgres(url, {
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

let db: Database | undefined;

export function getDatabase(): Database {
  if (!db) {
    db = createDatabase();
  }
  return db;
}
