/**
 * Embeddings generation using Azure OpenAI
 */

import { AZURE_OPENAI_CONFIG } from './azure-config';

const EMBEDDING_DIMENSIONS = 1536; // text-embedding-3-small default

export { EMBEDDING_DIMENSIONS };

/**
 * Generate embeddings for text using Azure OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { endpoint, apiKey, embeddingDeployment, apiVersion } = AZURE_OPENAI_CONFIG;

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI configuration missing. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.');
  }

  const url = `${endpoint}/openai/deployments/${embeddingDeployment}/embeddings?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure OpenAI embedding failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { endpoint, apiKey, embeddingDeployment, apiVersion } = AZURE_OPENAI_CONFIG;

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI configuration missing. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY.');
  }

  const url = `${endpoint}/openai/deployments/${embeddingDeployment}/embeddings?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure OpenAI embedding failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  // Sort by index to maintain order
  return data.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((item: { embedding: number[] }) => item.embedding);
}

/**
 * Create searchable text from officer profile
 * Concatenates all relevant fields for embedding
 */
export function createSearchableText(officer: {
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
}): string {
  const parts = [
    officer.name,
    officer.rank,
    officer.unit,
    officer.mos_skill,
    officer.skills,
    officer.experience,
    officer.deployments,
    officer.languages,
    officer.education,
    officer.civilian_occupation,
    officer.credentials,
    officer.awards,
    officer.additional_info,
    officer.detail_data,
    officer.clearance_level,
  ].filter(Boolean);

  return parts.join('\n\n');
}
