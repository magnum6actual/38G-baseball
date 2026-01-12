#!/usr/bin/env tsx
/**
 * Regenerate embeddings for all officers in the database
 *
 * Run with: npx tsx scripts/regenerate-embeddings.ts
 */

import 'dotenv/config';
import { getDb, initializeDatabase, saveEmbedding } from '../src/lib/db';
import { generateEmbedding, createSearchableText } from '../src/lib/embeddings';

interface Officer {
  id: string;
  name: string;
  rank?: string;
  unit?: string;
  mos_skill?: string;
  skills?: string;
  experience?: string;
  deployments?: string;
  languages?: string;
  education?: string;
  civilian_occupation?: string;
  credentials?: string;
  awards?: string;
  additional_info?: string;
  detail_data?: string | null;
  clearance_level?: string;
}

async function main() {
  console.log('Regenerating embeddings for all officers...\n');

  // Initialize database (ensures vec_embeddings table exists)
  initializeDatabase();
  const db = getDb();

  // Get all officers
  const officers = db.prepare('SELECT * FROM officers').all() as Officer[];
  console.log(`Found ${officers.length} officers\n`);

  let success = 0;
  let failed = 0;

  for (const officer of officers) {
    console.log(`Processing: ${officer.rank || ''} ${officer.name} (${officer.id})...`);

    try {
      const searchText = createSearchableText(officer);
      const embedding = await generateEmbedding(searchText);
      saveEmbedding(officer.id, embedding);
      console.log(`  - Generated embedding (${embedding.length} dimensions)`);
      success++;
    } catch (error) {
      console.error(`  - Failed: ${error}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n--- Complete ---');
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
