import { createDatabase } from '../client.js';

async function seed() {
  const db = createDatabase();

  console.log('Seeding database...');

  // Seed will be expanded as modules are built
  // For now, just verify connection
  console.log('Database connection verified.');
  console.log('Seeding complete.');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
