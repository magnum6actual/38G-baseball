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
import { chat, chatStream, SEARCH_SYSTEM_PROMPT, ChatMessage } from './claude';
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

Based on the officer profiles above and the conversation context, provide intelligent recommendations. Reference officers by their name and rank, and explain why they're good matches. If the query asks about specific officers by name, provide details from their profile.

IMPORTANT: At the very end of your response, after your prose recommendations, include TWO lines for machine parsing:

1. PRIMARY_TEAM: ["id1", "id2", "id3"] - Officers you are directly recommending as the core team, in rank order (best match first)
2. ALSO_MENTIONED: ["id4", "id5"] - Any other officers you referenced in your response (e.g., for risk mitigation, alternatives, or additional context) who are NOT in the primary team

If no additional officers were mentioned, use an empty array: ALSO_MENTIONED: []

These lines must appear at the very end and contain ONLY officer IDs. Do not include these lines in your prose explanation - they're for machine parsing only.`,
  });

  // Call Claude
  const response = await chat(messages, SEARCH_SYSTEM_PROMPT, 4096);

  // Parse the ranked officer IDs from the response
  let rankedOfficerIds: string[] = [];
  let proseResponse = response.content;

  // Extract the RANKED_IDS line
  const rankedIdsMatch = response.content.match(/RANKED_IDS:\s*\[([^\]]*)\]/);
  if (rankedIdsMatch) {
    try {
      // Parse the JSON array
      rankedOfficerIds = JSON.parse(`[${rankedIdsMatch[1]}]`);
      // Remove the RANKED_IDS line from the prose response
      proseResponse = response.content.replace(/\n*RANKED_IDS:\s*\[[^\]]*\]\n*/g, '').trim();
    } catch {
      console.error('Failed to parse ranked officer IDs, falling back to name matching');
    }
  }

  // Fallback: Extract officer IDs mentioned in the response if parsing failed
  if (rankedOfficerIds.length === 0) {
    const mentionedOfficers = officers.filter((o) => {
      const namePattern = new RegExp(o.name.split(' ').pop() || o.name, 'i');
      return namePattern.test(response.content);
    });
    rankedOfficerIds = mentionedOfficers.map((o) => o.id);
  }

  return {
    response: proseResponse,
    officerIds: rankedOfficerIds,
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

/**
 * Prepare RAG search context - retrieves officers and builds messages
 * Returns the data needed for streaming
 */
export async function prepareRagSearch(
  userQuery: string,
  conversationHistory: ConversationMessage[]
): Promise<{
  messages: ChatMessage[];
  officers: Officer[];
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

Based on the officer profiles above and the conversation context, provide intelligent recommendations. Reference officers by their name and rank, and explain why they're good matches. If the query asks about specific officers by name, provide details from their profile.

IMPORTANT: At the very end of your response, after your prose recommendations, include TWO lines for machine parsing:

1. PRIMARY_TEAM: ["id1", "id2", "id3"] - Officers you are directly recommending as the core team, in rank order (best match first)
2. ALSO_MENTIONED: ["id4", "id5"] - Any other officers you referenced in your response (e.g., for risk mitigation, alternatives, or additional context) who are NOT in the primary team

If no additional officers were mentioned, use an empty array: ALSO_MENTIONED: []

These lines must appear at the very end and contain ONLY officer IDs. Do not include these lines in your prose explanation - they're for machine parsing only.`,
  });

  return { messages, officers };
}

/**
 * Stream RAG search - yields text chunks as they arrive
 */
export async function* ragSearchStream(
  userQuery: string,
  conversationHistory: ConversationMessage[]
): AsyncGenerator<string, Officer[], unknown> {
  const { messages, officers } = await prepareRagSearch(userQuery, conversationHistory);

  // Stream the response
  for await (const chunk of chatStream(messages, SEARCH_SYSTEM_PROMPT, 4096)) {
    yield chunk;
  }

  // Return officers for ID extraction after streaming completes
  return officers;
}

/**
 * Parse officer IDs from completed response text
 * Returns primary team IDs and also-mentioned IDs separately
 */
export function parseOfficerIds(
  responseText: string,
  officers: Officer[]
): { proseResponse: string; primaryTeamIds: string[]; alsoMentionedIds: string[] } {
  let primaryTeamIds: string[] = [];
  let alsoMentionedIds: string[] = [];
  let proseResponse = responseText;

  // Extract the PRIMARY_TEAM line
  const primaryMatch = responseText.match(/PRIMARY_TEAM:\s*\[([^\]]*)\]/);
  if (primaryMatch) {
    try {
      primaryTeamIds = JSON.parse(`[${primaryMatch[1]}]`);
    } catch {
      console.error('Failed to parse PRIMARY_TEAM IDs');
    }
  }

  // Extract the ALSO_MENTIONED line
  const alsoMatch = responseText.match(/ALSO_MENTIONED:\s*\[([^\]]*)\]/);
  if (alsoMatch) {
    try {
      alsoMentionedIds = JSON.parse(`[${alsoMatch[1]}]`);
    } catch {
      console.error('Failed to parse ALSO_MENTIONED IDs');
    }
  }

  // Remove the machine-readable lines from the prose response
  proseResponse = responseText
    .replace(/\n*PRIMARY_TEAM:\s*\[[^\]]*\]\n*/g, '')
    .replace(/\n*ALSO_MENTIONED:\s*\[[^\]]*\]\n*/g, '')
    .trim();

  // Fallback: If no primary team IDs found, use name matching
  if (primaryTeamIds.length === 0) {
    const mentionedOfficers = officers.filter((o) => {
      const namePattern = new RegExp(o.name.split(' ').pop() || o.name, 'i');
      return namePattern.test(responseText);
    });
    primaryTeamIds = mentionedOfficers.map((o) => o.id);
  }

  return { proseResponse, primaryTeamIds, alsoMentionedIds };
}

/**
 * @deprecated Use parseOfficerIds instead
 */
export function parseRankedOfficerIds(
  responseText: string,
  officers: Officer[]
): { proseResponse: string; officerIds: string[] } {
  const { proseResponse, primaryTeamIds, alsoMentionedIds } = parseOfficerIds(responseText, officers);
  return { proseResponse, officerIds: [...primaryTeamIds, ...alsoMentionedIds] };
}
