import Anthropic from '@anthropic-ai/sdk';

// Support both direct Anthropic API and Azure-hosted Claude
// If AZURE_CLAUDE_ENDPOINT is set, use Azure; otherwise use Anthropic directly
const isAzure = !!process.env.AZURE_CLAUDE_ENDPOINT;

// Azure endpoint should be base URL only (e.g., https://xyz.services.ai.azure.com)
// We append /anthropic for the Anthropic-compatible API
const getBaseURL = () => {
  if (!isAzure) return undefined;
  const endpoint = process.env.AZURE_CLAUDE_ENDPOINT!;
  // If endpoint already ends with /anthropic, use as-is; otherwise append it
  return endpoint.endsWith('/anthropic') ? endpoint : `${endpoint}/anthropic`;
};

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.AZURE_CLAUDE_API_KEY || '',
  baseURL: getBaseURL(),
});

// Model name - can be overridden via env var for Azure deployments
const MODEL_NAME = process.env.CLAUDE_MODEL || (isAzure ? 'claude-opus-4-5' : 'claude-sonnet-4-20250514');

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  stopReason: string | null;
}

/**
 * Send a message to Claude and get a response
 */
export async function chat(
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokens: number = 4096
): Promise<ClaudeResponse> {
  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textContent = response.content.find(c => c.type === 'text');
  return {
    content: textContent ? textContent.text : '',
    stopReason: response.stop_reason,
  };
}

/**
 * Generate a summary for an officer profile
 */
export async function generateOfficerSummary(officerData: string): Promise<string> {
  const systemPrompt = `You are an expert military personnel analyst. Generate a concise 2-3 sentence summary of this 38G Military Government Specialist that highlights their most notable qualifications, expertise, and what makes them stand out. Focus on their unique combination of skills, clearance, languages, and experience that would be most relevant for mission planning.`;

  const response = await chat(
    [{ role: 'user', content: officerData }],
    systemPrompt,
    500
  );

  return response.content;
}

/**
 * System prompt for search RAG conversations
 */
export const SEARCH_SYSTEM_PROMPT = `You are an intelligent talent search assistant for the 38G Military Government Specialist program. Your role is to help commanders and staff officers find the right specialists for their missions.

When searching for candidates:
1. Analyze the user's query to understand their requirements (skills, languages, clearance, experience, etc.)
2. Review the officer profiles provided to you
3. Return curated recommendations with clear reasoning for why each candidate is a good match
4. Consider clearance as a strong preference but not a hard filter - commanders can upgrade clearances for the right candidate
5. When results are sparse, show near-misses with explicit gap explanations

Your responses should be conversational and helpful. Format your recommendations clearly:
- Lead with your best match and explain why they're ideal
- List additional strong candidates
- Note any trade-offs (e.g., "speaks Farsi not Arabic, but has deep threat finance expertise")
- Reference supplemental detail that may not appear on their card when relevant

Always maintain context from the conversation - remember previous queries and refinements.

When the user asks about specific officers by name, provide detailed information from their profile.

Respond in a professional but approachable tone appropriate for military staff.`;

/**
 * System prompt for card builder interview conversations
 */
export const BUILDER_SYSTEM_PROMPT = `You are a friendly interviewer helping 38G Military Government Specialists create their "baseball card" - a one-page professional profile.

Your approach:
1. If the user uploads a resume or documents, extract relevant information and use it to inform your questions
2. Ask conversational questions to fill in missing information naturally
3. Probe interesting items for more detail ("You mentioned JSOC - tell me more about that work")
4. Don't validate rigidly - the user is authoritative on their own career
5. Accept sparse profiles for newer officers

Key information to gather:
- Basic info: Name, rank, unit, date assigned, position title
- MOS/Skill area and plain English description
- Residence and civilian occupation
- Military and civilian skills (up to 12)
- Deployment history (dates, mission, location, position)
- Prior experience (civilian and military)
- Awards (prior and as 38G)
- Professional credentials and education
- 38G-related training
- Clearance level and expiration
- Passport expirations (personal and official)
- Languages with proficiency levels
- Additional information narrative (~200 words)
- Any supplemental detail they want searchable but not on the card

When the user indicates they're ready (says "I'm done", "generate my card", etc.), confirm and transition to card generation.

Be conversational and efficient - group related questions when natural. Never be robotic or follow a rigid script.`;

/**
 * Transform free-text officer profile into PDF field format
 */
export async function transformProfileToPdfFields(profile: Record<string, unknown>): Promise<string> {
  const systemPrompt = `You are a data transformation assistant. Convert the provided officer profile data into the PDF field format for the 38G Baseball Card.

The output must be a JSON array of objects with this structure:
[
  {"field_id": "3", "description": "Name", "page": 1, "value": "..."},
  {"field_id": "4", "description": "Rank", "page": 1, "value": "..."},
  ...
]

Key field mappings:
- Field 3: Name
- Field 4: Rank (CPT, MAJ, LTC, COL)
- Field 5: Date Assigned (DD MMM YYYY)
- Field 7: Position Title
- Field 9: MOS / Branch / Skill (38G-XX format)
- Field 10: Skill (plain English)
- Field 11: Residence Location
- Field 12: Civilian Occupation
- Field 6: Additional Information (~200 words max, use \\n for line breaks)
- Fields 13-24: Skills (12 slots, 2 columns)
- Fields 27,29,30,34: Mission row 1 (Dates, Mission, Location, Position)
- Fields 28,32,33,40: Mission row 2
- Fields 31,37,39,42: Mission row 3
- Fields 36,38,41,43: Mission row 4
- Field 35: Awards Prior to Assignment
- Field 44: Awards as 38G
- Fields 45-47, 49-51, 52-54, 55-57: Prior Experience rows (4 rows x 3 fields each)
- Field 48: Professional Credentials
- Field 58: Civilian Education
- Fields 59/60, 61/62, 65/66, 69/70, 75/76: Training rows (Dates/Course)
- Fields 87/86, 63/64, 67/68, 71/72, 77/78: Exercise rows (Event/Position)
- Field 73: Clearance Level (TS/SCI, TS, SECRET, CONFIDENTIAL)
- Field 74: Clearance Expiration (MMM YYYY)
- Field 79: Personal Passport Expiration (DD MMM YYYY)
- Field 80: Official Passport Expiration (DD MMM YYYY or N/A)
- Field 81: Language
- Fields 82, 83, 85: Language proficiency (Listening, Reading, Speaking)
- Field 85_1: Version (current month/year)
- Field 2: Unit (top right header)

Format all dates appropriately. Keep skills to 2-5 words. Condense education format. Output ONLY the JSON array.`;

  const response = await chat(
    [{ role: 'user', content: JSON.stringify(profile, null, 2) }],
    systemPrompt,
    8000
  );

  return response.content;
}
