/**
 * Card Builder - Interview and Profile Creation Logic
 *
 * Handles the conversational interview flow for creating 38G baseball cards.
 */

import { chat, BUILDER_SYSTEM_PROMPT, ChatMessage, transformProfileToPdfFields } from './claude';
import { ConversationMessage } from '@/types';

export type BuilderState = 'interviewing' | 'headshot' | 'generating' | 'complete';

export interface BuilderProfile {
  // Core identifiers
  name?: string;
  rank?: string;
  unit?: string;
  date_assigned?: string;
  position_title?: string;

  // MOS/Skill
  mos_skill?: string;
  skill_plain?: string;

  // Location/Job
  residence?: string;
  civilian_occupation?: string;

  // Skills (up to 12)
  skills?: string[];

  // Deployments
  deployments?: Array<{
    dates: string;
    mission: string;
    location: string;
    position: string;
  }>;

  // Prior experience
  prior_experience?: Array<{
    dates: string;
    location: string;
    position: string;
  }>;

  // Exercises
  exercises?: Array<{
    event: string;
    position_dates: string;
  }>;

  // Training
  training_38g?: Array<{
    dates: string;
    course: string;
  }>;

  // Awards
  awards_prior?: string;
  awards_38g?: string;

  // Credentials/Education
  credentials?: string;
  education?: string;

  // Clearance
  clearance_level?: string;
  clearance_exp?: string;

  // Passports
  passport_personal?: string;
  passport_official?: string;

  // Languages
  languages?: Array<{
    language: string;
    listening: string;
    reading: string;
    speaking: string;
  }>;

  // Additional info
  additional_info?: string;

  // Supplemental detail (searchable but not on card)
  detail_data?: string;

  // Photo data
  photo_original?: string; // base64
  photo_processed?: string; // base64
}

export interface BuilderContext {
  state: BuilderState;
  profile: BuilderProfile;
  extractedFromDocuments: boolean;
}

/**
 * Determine if the user wants to generate their card
 */
function isGenerationRequest(message: string): boolean {
  const triggers = [
    "i'm done",
    "im done",
    "generate my card",
    "generate card",
    "create my card",
    "create card",
    "finish",
    "that's it",
    "that's all",
    "thats it",
    "thats all",
    "done",
    "complete",
  ];

  const lower = message.toLowerCase().trim();
  return triggers.some((t) => lower.includes(t));
}

/**
 * Determine if we should transition to headshot phase
 */
function shouldTransitionToHeadshot(message: string, profile: BuilderProfile): boolean {
  // Check if the user is indicating they want to upload a photo
  const photoKeywords = [
    'photo',
    'picture',
    'headshot',
    'upload photo',
    'add photo',
    'ready for photo',
  ];

  const lower = message.toLowerCase();
  const mentionsPhoto = photoKeywords.some((k) => lower.includes(k));

  // Also check if we have enough profile data to warrant asking about photo
  const hasBasicInfo = Boolean(profile.name && profile.rank);

  return mentionsPhoto || (hasBasicInfo && lower.includes('next'));
}

/**
 * Extract profile information from LLM response
 * The LLM includes structured data markers that we can parse
 */
function extractProfileFromResponse(response: string, currentProfile: BuilderProfile): BuilderProfile {
  // Look for JSON block in the response
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      const extracted = JSON.parse(jsonMatch[1]);
      return { ...currentProfile, ...extracted };
    } catch (e) {
      // JSON parsing failed, continue with current profile
    }
  }

  // Simple text extraction for common fields
  const updated = { ...currentProfile };

  // Extract name if mentioned with patterns like "Name: John Smith" or "I see your name is John Smith"
  const namePatterns = [
    /name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z]\.?\s*[A-Z][a-z]+)?)/i,
    /(?:you are|you're)\s+([A-Z][a-z]+ [A-Z][a-z]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = response.match(pattern);
    if (match && !updated.name) {
      updated.name = match[1].trim();
      break;
    }
  }

  // Extract rank
  const rankPatterns = [
    /rank[:\s]+(CPT|MAJ|LTC|COL|Captain|Major|Lieutenant Colonel|Colonel)/i,
    /(?:you are|you're) (?:a )?(CPT|MAJ|LTC|COL|Captain|Major|Lieutenant Colonel|Colonel)/i,
  ];

  for (const pattern of rankPatterns) {
    const match = response.match(pattern);
    if (match && !updated.rank) {
      // Normalize to abbreviation
      const rankMap: Record<string, string> = {
        'captain': 'CPT',
        'major': 'MAJ',
        'lieutenant colonel': 'LTC',
        'colonel': 'COL',
      };
      updated.rank = rankMap[match[1].toLowerCase()] || match[1].toUpperCase();
      break;
    }
  }

  return updated;
}

/**
 * Process a builder conversation turn
 */
export async function processBuilderMessage(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  currentContext: BuilderContext,
  documentContent?: string
): Promise<{
  response: string;
  context: BuilderContext;
}> {
  // Check for state transitions
  let newState = currentContext.state;

  // Check if user wants to generate their card
  if (currentContext.state === 'interviewing' && isGenerationRequest(userMessage)) {
    newState = 'headshot';
  }

  // Check if we should ask about headshot
  if (
    currentContext.state === 'interviewing' &&
    shouldTransitionToHeadshot(userMessage, currentContext.profile)
  ) {
    newState = 'headshot';
  }

  // Build messages for Claude
  const messages: ChatMessage[] = [];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Build the current message with context
  let messageContent = userMessage;

  // Add document content if provided
  if (documentContent) {
    messageContent = `[User uploaded a document with the following content:]

${documentContent}

---

User message: ${userMessage}`;
  }

  // Add state context
  if (newState === 'headshot') {
    messageContent += `

[SYSTEM NOTE: The user is ready for the headshot phase. Acknowledge their progress and ask them to upload their photo. Mention they can optionally specify enhancement requests like "reduce shadows" or "soften wrinkles".]`;
  }

  // Add current profile context
  const profileSummary = Object.entries(currentContext.profile)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');

  if (profileSummary) {
    messageContent += `

[Current profile data collected:]
${profileSummary}`;
  }

  messages.push({
    role: 'user',
    content: messageContent,
  });

  // Get response from Claude
  const response = await chat(messages, BUILDER_SYSTEM_PROMPT, 2048);

  // Extract any profile updates from the response
  const updatedProfile = extractProfileFromResponse(response.content, currentContext.profile);

  return {
    response: response.content,
    context: {
      state: newState,
      profile: updatedProfile,
      extractedFromDocuments: currentContext.extractedFromDocuments || !!documentContent,
    },
  };
}

/**
 * Generate PDF field values from profile
 */
export async function generatePdfFields(profile: BuilderProfile): Promise<string> {
  return transformProfileToPdfFields(profile as Record<string, unknown>);
}
