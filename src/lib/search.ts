/**
 * Search functionality using RAG (Retrieval-Augmented Generation)
 *
 * 1. Embed the query using Azure OpenAI
 * 2. Vector search to find relevant officers
 * 3. Pass officer data to Claude for reasoning
 * 4. Return curated recommendations
 */

import { getDb, searchByEmbedding, getOfficerById, getAllOfficers } from './db';
import { generateEmbedding } from './embeddings';
import { chat, SEARCH_SYSTEM_PROMPT, ChatMessage } from './claude';
import { Officer, OfficerSummary, ConversationMessage } from '@/types';

/**
 * Retrieve officers relevant to a query using vector search
 */
export async function retrieveRelevantOfficers(
  query: string,
  limit: number = 10
): Promise<Officer[]> {
  // Check if we have embeddings
  const db = getDb();
  const embeddingCount = (db.prepare('SELECT COUNT(*) as count FROM vec_embeddings').get() as { count: number }).count;

  if (embeddingCount === 0) {
    // No embeddings - fall back to returning all officers
    console.log('No embeddings found, returning all officers');
    return getAllOfficers();
  }

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Vector search
    const results = searchByEmbedding(queryEmbedding, limit);

    // Get full officer data for each result
    const officers: Officer[] = [];
    for (const result of results) {
      const officer = getOfficerById(result.officer_id);
      if (officer) {
        officers.push(officer);
      }
    }

    return officers;
  } catch (error) {
    console.error('Vector search error:', error);
    // Fall back to returning all officers
    return getAllOfficers();
  }
}

/**
 * Format officer data for the LLM context
 */
function formatOfficerForContext(officer: Officer, index: number): string {
  return `
=== Officer ${index + 1}: ${officer.rank} ${officer.name} ===
ID: ${officer.id}
Unit: ${officer.unit}
MOS/Skill: ${officer.mos_skill}
Clearance: ${officer.clearance_level}
Civilian Occupation: ${officer.civilian_occupation}

Skills: ${officer.skills}

Languages: ${officer.languages}

Education: ${officer.education}

Credentials: ${officer.credentials}

Deployments:
${officer.deployments}

Experience:
${officer.experience}

Additional Info:
${officer.additional_info}

${officer.detail_data ? `Supplemental Details:\n${officer.detail_data}` : ''}
`.trim();
}

/**
 * Perform a RAG search with conversation context
 */
export async function ragSearch(
  userQuery: string,
  conversationHistory: ConversationMessage[]
): Promise<{
  response: string;
  officerIds: string[];
}> {
  // Build the full query context from conversation
  const queryContext = conversationHistory
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n');
  const fullQuery = queryContext ? `${queryContext}\n${userQuery}` : userQuery;

  // Retrieve relevant officers
  const officers = await retrieveRelevantOfficers(fullQuery, 15);

  // Format officers for context
  const officerContext = officers
    .map((o, i) => formatOfficerForContext(o, i))
    .join('\n\n');

  // Build messages for Claude
  const messages: ChatMessage[] = [];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add the current query with officer context
  messages.push({
    role: 'user',
    content: `Here are the officers in the talent database that may be relevant:

${officerContext}

---

User query: ${userQuery}

Based on the officer profiles above and the conversation context, provide intelligent recommendations. Reference officers by their name and rank, and explain why they're good matches. If the query asks about specific officers by name, provide details from their profile.`,
  });

  // Call Claude
  const response = await chat(messages, SEARCH_SYSTEM_PROMPT, 4096);

  // Extract officer IDs mentioned in the response
  // The LLM response should reference officers that it recommends
  const mentionedOfficers = officers.filter((o) => {
    const namePattern = new RegExp(o.name.split(' ').pop() || o.name, 'i');
    return namePattern.test(response.content);
  });

  return {
    response: response.content,
    officerIds: mentionedOfficers.map((o) => o.id),
  };
}

/**
 * Get officer summaries for display in the UI
 */
export function getOfficerSummaries(officerIds: string[]): OfficerSummary[] {
  const summaries: OfficerSummary[] = [];

  for (const id of officerIds) {
    const officer = getOfficerById(id);
    if (!officer) continue;

    summaries.push({
      id: officer.id,
      name: officer.name,
      rank: officer.rank,
      unit: officer.unit,
      summary: officer.summary || `${officer.mos_skill}. ${officer.civilian_occupation}.`,
      photoUrl: officer.photo_blob ? `/api/officers/${officer.id}/photo` : null,
    });
  }

  return summaries;
}
