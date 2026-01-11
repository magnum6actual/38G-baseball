#!/usr/bin/env tsx
/**
 * Initialize the 38G Talent Search database
 * Run with: npm run db:init
 */

import { initializeDatabase, getDb } from '../src/lib/db';

console.log('Initializing 38G Talent Search database...');

try {
  initializeDatabase();

  // Verify tables were created
  const db = getDb();
  const tables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
  `).all() as { name: string }[];

  console.log('\nCreated tables:');
  tables.forEach((t) => console.log(`  - ${t.name}`));

  // Check vec_embeddings virtual table
  const vecInfo = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='vec_embeddings'
  `).get();

  if (vecInfo) {
    console.log('\nVector search table (vec_embeddings) created successfully');
  }

  console.log('\nDatabase initialization complete!');
  console.log(`Database location: ${process.env.DATABASE_PATH || './data/38g.db'}`);
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}
