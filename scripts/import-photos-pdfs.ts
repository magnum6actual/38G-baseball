/**
 * Import generated photos and PDFs into the database
 *
 * Usage:
 *   npx tsx scripts/import-photos-pdfs.ts
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/38g.db';
const PHOTOS_DIR = './generated_photos';
const PDFS_DIR = './generated_pdfs';

async function main() {
  // Connect to database
  const db = new Database(DB_PATH);

  console.log('Importing photos and PDFs into database...\n');

  // Get all officers
  const officers = db.prepare('SELECT id, name, rank FROM officers').all() as Array<{
    id: string;
    name: string;
    rank: string;
  }>;

  console.log(`Found ${officers.length} officers in database\n`);

  // Prepare update statement
  const updateStmt = db.prepare(`
    UPDATE officers
    SET photo_blob = ?, pdf_blob = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  let photoCount = 0;
  let pdfCount = 0;
  let errorCount = 0;

  for (const officer of officers) {
    const photoPath = path.join(PHOTOS_DIR, `${officer.id}.png`);
    const pdfPath = path.join(PDFS_DIR, `${officer.id}.pdf`);

    let photoBlob: Buffer | null = null;
    let pdfBlob: Buffer | null = null;

    // Read photo if exists
    if (fs.existsSync(photoPath)) {
      photoBlob = fs.readFileSync(photoPath);
      photoCount++;
    } else {
      console.log(`  ⚠ No photo found for ${officer.id}`);
    }

    // Read PDF if exists
    if (fs.existsSync(pdfPath)) {
      pdfBlob = fs.readFileSync(pdfPath);
      pdfCount++;
    } else {
      console.log(`  ⚠ No PDF found for ${officer.id}`);
    }

    // Update database
    if (photoBlob || pdfBlob) {
      try {
        updateStmt.run(photoBlob, pdfBlob, officer.id);
        console.log(`✓ ${officer.rank} ${officer.name} (${officer.id})`);
      } catch (error) {
        console.error(`✗ Error updating ${officer.id}:`, error);
        errorCount++;
      }
    }
  }

  db.close();

  console.log('\n' + '='.repeat(50));
  console.log(`Import complete!`);
  console.log(`  Photos imported: ${photoCount}`);
  console.log(`  PDFs imported: ${pdfCount}`);
  console.log(`  Errors: ${errorCount}`);
}

main().catch(console.error);
