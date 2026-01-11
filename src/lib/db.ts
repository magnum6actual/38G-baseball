import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import path from 'path';
import { Officer, Conversation, ConversationMessage } from '@/types';

const DB_PATH = process.env.DATABASE_PATH || './data/38g.db';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);

    // Load sqlite-vec extension
    sqliteVec.load(db);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDb();

  // Create officers table
  database.exec(`
    CREATE TABLE IF NOT EXISTS officers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rank TEXT,
      unit TEXT,
      clearance_level TEXT,
      mos_skill TEXT,
      skills TEXT,
      experience TEXT,
      deployments TEXT,
      languages TEXT,
      education TEXT,
      civilian_occupation TEXT,
      credentials TEXT,
      awards TEXT,
      additional_info TEXT,
      detail_data TEXT,
      summary TEXT,
      pdf_blob BLOB,
      photo_blob BLOB,
      photo_original_blob BLOB,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create embeddings virtual table for vector search
  // Using 1536 dimensions for Azure text-embedding-3-small
  database.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_embeddings USING vec0(
      officer_id TEXT PRIMARY KEY,
      embedding FLOAT[1536]
    )
  `);

  // Create conversations table
  database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      officer_id TEXT,
      messages TEXT NOT NULL DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (officer_id) REFERENCES officers(id) ON DELETE SET NULL
    )
  `);

  console.log('Database initialized successfully');
}

// Officer operations
export function createOfficer(officer: Omit<Officer, 'created_at' | 'updated_at'>): Officer {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO officers (
      id, name, rank, unit, clearance_level, mos_skill, skills, experience,
      deployments, languages, education, civilian_occupation, credentials,
      awards, additional_info, detail_data, summary, pdf_blob, photo_blob, photo_original_blob
    ) VALUES (
      @id, @name, @rank, @unit, @clearance_level, @mos_skill, @skills, @experience,
      @deployments, @languages, @education, @civilian_occupation, @credentials,
      @awards, @additional_info, @detail_data, @summary, @pdf_blob, @photo_blob, @photo_original_blob
    )
  `);

  stmt.run(officer);
  return getOfficerById(officer.id)!;
}

export function getOfficerById(id: string): Officer | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM officers WHERE id = ?');
  return stmt.get(id) as Officer | null;
}

export function getAllOfficers(): Officer[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM officers ORDER BY name');
  return stmt.all() as Officer[];
}

export function updateOfficer(id: string, updates: Partial<Officer>): Officer | null {
  const database = getDb();
  const fields = Object.keys(updates)
    .filter(k => k !== 'id' && k !== 'created_at')
    .map(k => `${k} = @${k}`)
    .join(', ');

  if (!fields) return getOfficerById(id);

  const stmt = database.prepare(`
    UPDATE officers SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id
  `);

  stmt.run({ ...updates, id });
  return getOfficerById(id);
}

export function deleteOfficer(id: string): boolean {
  const database = getDb();
  const stmt = database.prepare('DELETE FROM officers WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Embedding operations
export function saveEmbedding(officerId: string, embedding: number[]): void {
  const database = getDb();

  // Delete existing embedding for this officer
  database.prepare('DELETE FROM vec_embeddings WHERE officer_id = ?').run(officerId);

  // Insert new embedding
  const stmt = database.prepare(`
    INSERT INTO vec_embeddings (officer_id, embedding) VALUES (?, ?)
  `);

  // Convert embedding array to the format sqlite-vec expects
  const embeddingBlob = new Float32Array(embedding).buffer;
  stmt.run(officerId, Buffer.from(embeddingBlob));
}

export function searchByEmbedding(queryEmbedding: number[], limit: number = 10): Array<{ officer_id: string; distance: number }> {
  const database = getDb();

  const embeddingBlob = new Float32Array(queryEmbedding).buffer;

  const stmt = database.prepare(`
    SELECT officer_id, distance
    FROM vec_embeddings
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT ?
  `);

  return stmt.all(Buffer.from(embeddingBlob), limit) as Array<{ officer_id: string; distance: number }>;
}

// Conversation operations
export function createConversation(
  id: string,
  type: 'search' | 'builder',
  officerId?: string
): Conversation {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO conversations (id, type, officer_id, messages)
    VALUES (?, ?, ?, '[]')
  `);

  stmt.run(id, type, officerId || null);
  return getConversationById(id)!;
}

export function getConversationById(id: string): Conversation | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM conversations WHERE id = ?');
  const row = stmt.get(id) as {
    id: string;
    type: 'search' | 'builder';
    officer_id: string | null;
    messages: string;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) return null;

  return {
    ...row,
    messages: JSON.parse(row.messages) as ConversationMessage[]
  };
}

export function addMessageToConversation(
  conversationId: string,
  message: ConversationMessage
): Conversation | null {
  const conversation = getConversationById(conversationId);
  if (!conversation) return null;

  const messages = [...conversation.messages, message];

  const database = getDb();
  const stmt = database.prepare(`
    UPDATE conversations
    SET messages = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(JSON.stringify(messages), conversationId);
  return getConversationById(conversationId);
}

export function updateConversationOfficerId(
  conversationId: string,
  officerId: string
): void {
  const database = getDb();
  const stmt = database.prepare(`
    UPDATE conversations
    SET officer_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(officerId, conversationId);
}
