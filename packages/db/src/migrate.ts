import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { createDatabase } from './client.js';

async function runMigrations() {
  const db = createDatabase();

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './src/migrations' });
  console.log('Migrations complete.');

  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
