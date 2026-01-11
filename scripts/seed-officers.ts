#!/usr/bin/env tsx
/**
 * Seed the database with fictional officers from fictional_officers.json
 *
 * This script:
 * 1. Reads the fictional officers JSON
 * 2. Transforms structured data to free-text format
 * 3. Creates officer records in the database
 * 4. Generates embeddings for each officer (requires Azure OpenAI)
 * 5. Generates LLM summaries (requires Claude)
 *
 * Run with: npm run db:seed
 */

import { createOfficer, getDb, initializeDatabase, saveEmbedding } from '../src/lib/db';
import { generateEmbedding, createSearchableText } from '../src/lib/embeddings';
import { generateOfficerSummary } from '../src/lib/claude';
import { FictionalOfficer } from '../src/types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const OFFICERS_FILE = './fictional_officers.json';

/**
 * Transform structured officer data to free-text format
 */
function transformOfficer(fo: FictionalOfficer): {
  id: string;
  name: string;
  rank: string;
  unit: string;
  clearance_level: string;
  mos_skill: string;
  skills: string;
  experience: string;
  deployments: string;
  languages: string;
  education: string;
  civilian_occupation: string;
  credentials: string;
  awards: string;
  additional_info: string;
  detail_data: string | null;
  summary: string | null;
  pdf_blob: Buffer | null;
  photo_blob: Buffer | null;
  photo_original_blob: Buffer | null;
} {
  // Transform skills array to text
  const skills = fo.skills.join(', ');

  // Transform deployments to text
  const deployments = fo.deployments
    .map((d) => `${d.dates}: ${d.mission} - ${d.location} (${d.position})`)
    .join('\n');

  // Transform prior experience to text
  const experience = fo.prior_experience
    .map((e) => `${e.dates}: ${e.location} - ${e.position}`)
    .join('\n');

  // Transform languages to text
  const languages = fo.languages
    .map((l) => `${l.language} (L:${l.listening}/R:${l.reading}/S:${l.speaking})`)
    .join(', ');

  // Transform awards
  const awards = [fo.awards_prior, fo.awards_38g].filter(Boolean).join('; 38G: ');

  // Create detail data from exercises and training
  const detailParts: string[] = [];

  if (fo.exercises.length > 0) {
    detailParts.push(
      'Exercises:\n' +
        fo.exercises.map((e) => `  - ${e.event}: ${e.position_dates}`).join('\n')
    );
  }

  if (fo.training_38g.length > 0) {
    detailParts.push(
      '38G Training:\n' +
        fo.training_38g.map((t) => `  - ${t.dates}: ${t.course}`).join('\n')
    );
  }

  const detail_data = detailParts.length > 0 ? detailParts.join('\n\n') : null;

  return {
    id: fo.id,
    name: fo.name,
    rank: fo.rank,
    unit: fo.unit,
    clearance_level: fo.clearance_level,
    mos_skill: `${fo.mos_skill} - ${fo.skill_plain}`,
    skills,
    experience,
    deployments,
    languages: languages || 'None listed',
    education: fo.education,
    civilian_occupation: fo.civilian_occupation,
    credentials: fo.credentials || 'None listed',
    awards: awards || 'None listed',
    additional_info: fo.additional_info,
    detail_data,
    summary: null, // Will be generated
    pdf_blob: null,
    photo_blob: null,
    photo_original_blob: null,
  };
}

async function main() {
  console.log('Starting officer seeding process...\n');

  // Initialize database
  console.log('Initializing database...');
  initializeDatabase();

  // Read fictional officers
  console.log('Reading fictional officers...');
  const jsonPath = path.resolve(OFFICERS_FILE);
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(jsonContent) as { officers: FictionalOfficer[] };

  console.log(`Found ${data.officers.length} officers to seed\n`);

  // Check if we have Azure credentials for embeddings
  const hasEmbeddings = process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY;
  const hasClaude = process.env.ANTHROPIC_API_KEY || process.env.AZURE_CLAUDE_API_KEY;

  if (!hasEmbeddings) {
    console.log('Warning: Azure OpenAI credentials not found. Skipping embeddings generation.');
    console.log('Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY to generate embeddings.\n');
  }

  if (!hasClaude) {
    console.log('Warning: Claude credentials not found. Skipping summary generation.');
    console.log('Set ANTHROPIC_API_KEY or AZURE_CLAUDE_API_KEY to generate summaries.\n');
  }

  // Process each officer
  for (const fo of data.officers) {
    console.log(`Processing: ${fo.rank} ${fo.name}...`);

    try {
      // Transform to free-text format
      const officer = transformOfficer(fo);

      // Create officer record
      const created = createOfficer(officer);
      console.log(`  - Created officer record`);

      // Generate embedding if credentials available
      if (hasEmbeddings) {
        const searchText = createSearchableText(officer);
        try {
          const embedding = await generateEmbedding(searchText);
          saveEmbedding(officer.id, embedding);
          console.log(`  - Generated embedding (${embedding.length} dimensions)`);
        } catch (error) {
          console.log(`  - Failed to generate embedding: ${error}`);
        }
      }

      // Generate summary if credentials available
      if (hasClaude) {
        const searchText = createSearchableText(officer);
        try {
          const summary = await generateOfficerSummary(searchText);
          // Update officer with summary
          const db = getDb();
          db.prepare('UPDATE officers SET summary = ? WHERE id = ?').run(summary, officer.id);
          console.log(`  - Generated summary`);
        } catch (error) {
          console.log(`  - Failed to generate summary: ${error}`);
        }
      }
    } catch (error) {
      console.error(`  - Error processing officer: ${error}`);
    }
  }

  // Summary
  const db = getDb();
  const officerCount = (db.prepare('SELECT COUNT(*) as count FROM officers').get() as { count: number }).count;
  const embeddingCount = (db.prepare('SELECT COUNT(*) as count FROM vec_embeddings').get() as { count: number }).count;
  const summaryCount = (db.prepare('SELECT COUNT(*) as count FROM officers WHERE summary IS NOT NULL').get() as { count: number }).count;

  console.log('\n--- Seeding Complete ---');
  console.log(`Officers created: ${officerCount}`);
  console.log(`Embeddings generated: ${embeddingCount}`);
  console.log(`Summaries generated: ${summaryCount}`);
}

main().catch(console.error);
