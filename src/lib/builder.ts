/**
 * Card Builder - Interview and Profile Creation Logic
 *
 * Handles the conversational interview flow for creating 38G baseball cards.
 */

import { chat, chatStream, BUILDER_SYSTEM_PROMPT, BUILDER_CHAT_PROMPT, BUILDER_UPDATE_PROMPT, ChatMessage, transformProfileToPdfFields, DocumentContent, TextContent } from './claude';
import { ConversationMessage } from '@/types';

export interface DocumentUpload {
  filename: string;
  content: string; // base64
  mediaType: string;
}

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
 * Determine if we should transition to headshot phase based on user message
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
 * Check if the LLM response indicates interview is complete
 */
function llmIndicatesComplete(response: string): boolean {
  const completionPhrases = [
    // Explicit marker
    '[interview_complete]',
    // Photo-related phrases
    'ready to generate',
    'ready for your photo',
    'ready for the photo',
    'upload your photo',
    'upload a photo',
    'let\'s move on to your photo',
    'move on to the headshot',
    'time for your headshot',
    'proceed to the photo',
    'next step is your photo',
    'add your photo',
    'need your photo',
    'photo upload',
    // Card generation phrases
    'generate your card',
    'create your card',
    'let\'s create your',
    'let\'s generate your',
    'ready to create your card',
    'proceed to card generation',
    'move on to generating',
    // General completion phrases
    'have everything i need',
    'have all the information',
    'gathered enough information',
    'all the details i need',
    'enough to create',
  ];

  const lower = response.toLowerCase();
  return completionPhrases.some((phrase) => lower.includes(phrase));
}

/**
 * Extract profile information from LLM response
 * The LLM includes structured JSON data that we parse
 */
function extractProfileFromResponse(response: string, currentProfile: BuilderProfile): BuilderProfile {
  // Look for JSON block in the response - handle various formats
  const jsonPatterns = [
    /```json\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?\{[\s\S]*\}[\s\S]*?)\s*```/,
  ];

  for (const pattern of jsonPatterns) {
    const jsonMatch = response.match(pattern);
    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1].trim();
        const extracted = JSON.parse(jsonStr);
        // Merge with current profile, keeping existing data if new data is empty/null
        const merged = { ...currentProfile };
        for (const [key, value] of Object.entries(extracted)) {
          if (value !== null && value !== undefined && value !== '' &&
              !(Array.isArray(value) && value.length === 0)) {
            (merged as Record<string, unknown>)[key] = value;
          }
        }
        return merged;
      } catch (e) {
        console.warn('Failed to parse profile JSON:', e);
        // JSON parsing failed, continue to next pattern
      }
    }
  }

  // Fallback: Simple text extraction for common fields
  const updated = { ...currentProfile };

  // Extract name if mentioned with patterns like "Name: John Smith"
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
 * Strip JSON profile block from response for display
 */
function stripProfileJsonFromResponse(response: string): string {
  // Remove JSON code blocks that contain profile data
  return response
    .replace(/\n*```json\s*\{[\s\S]*?\}\s*```\n*/g, '')
    .replace(/\n*```\s*\{[\s\S]*?\}\s*```\n*/g, '')
    .trim();
}

/**
 * Process a builder conversation turn
 */
export async function processBuilderMessage(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  currentContext: BuilderContext,
  documents?: DocumentUpload[]
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
  let textContent = userMessage;

  // Add state context
  if (newState === 'headshot') {
    textContent += `

[SYSTEM NOTE: The user is ready for the headshot phase. Acknowledge their progress and ask them to upload their photo. Mention they can optionally specify enhancement requests like "reduce shadows" or "soften wrinkles".]`;
  }

  // Add current profile context
  const profileSummary = Object.entries(currentContext.profile)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');

  if (profileSummary) {
    textContent += `

[Current profile data collected:]
${profileSummary}`;
  }

  // Build message content - either simple string or array with documents
  if (documents && documents.length > 0) {
    const contentBlocks: (TextContent | DocumentContent)[] = [];

    // Add documents first
    for (const doc of documents) {
      contentBlocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: doc.mediaType,
          data: doc.content,
        },
      });
    }

    // Add text message with document context
    const docNames = documents.map(d => d.filename).join(', ');
    contentBlocks.push({
      type: 'text',
      text: `[User uploaded: ${docNames}]\n\n${textContent}`,
    });

    messages.push({
      role: 'user',
      content: contentBlocks,
    });
  } else {
    messages.push({
      role: 'user',
      content: textContent,
    });
  }

  // Get response from Claude
  const response = await chat(messages, BUILDER_SYSTEM_PROMPT, 2048);

  // Extract any profile updates from the response
  const updatedProfile = extractProfileFromResponse(response.content, currentContext.profile);

  // Strip JSON block from response for display to user
  const cleanResponse = stripProfileJsonFromResponse(response.content);

  return {
    response: cleanResponse,
    context: {
      state: newState,
      profile: updatedProfile,
      extractedFromDocuments: currentContext.extractedFromDocuments || !!(documents && documents.length > 0),
    },
  };
}

/**
 * Process a builder conversation turn with streaming
 * Yields text chunks as they arrive, then returns final context
 */
export async function* processBuilderMessageStream(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  currentContext: BuilderContext,
  documents?: DocumentUpload[]
): AsyncGenerator<{ type: 'text'; content: string } | { type: 'done'; context: BuilderContext; cleanResponse: string }> {
  // Check for state transitions
  let newState = currentContext.state;

  if (currentContext.state === 'interviewing' && isGenerationRequest(userMessage)) {
    newState = 'headshot';
  }

  if (
    currentContext.state === 'interviewing' &&
    shouldTransitionToHeadshot(userMessage, currentContext.profile)
  ) {
    newState = 'headshot';
  }

  // Build messages for Claude
  const messages: ChatMessage[] = [];

  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Build the current message with context
  let textContent = userMessage;

  if (newState === 'headshot') {
    textContent += `

[SYSTEM NOTE: The user is ready for the headshot phase. Acknowledge their progress and ask them to upload their photo. Mention they can optionally specify enhancement requests like "reduce shadows" or "soften wrinkles".]`;
  }

  const profileSummary = Object.entries(currentContext.profile)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');

  if (profileSummary) {
    textContent += `

[Current profile data collected:]
${profileSummary}`;
  }

  // Build message content - either simple string or array with documents
  if (documents && documents.length > 0) {
    const contentBlocks: (TextContent | DocumentContent)[] = [];

    // Add documents first
    for (const doc of documents) {
      contentBlocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: doc.mediaType,
          data: doc.content,
        },
      });
    }

    // Add text message with document context
    const docNames = documents.map(d => d.filename).join(', ');
    contentBlocks.push({
      type: 'text',
      text: `[User uploaded: ${docNames}]\n\n${textContent}`,
    });

    messages.push({
      role: 'user',
      content: contentBlocks,
    });
  } else {
    messages.push({
      role: 'user',
      content: textContent,
    });
  }

  // Stream response from Claude, filtering out JSON code blocks in real-time
  let fullResponse = '';
  let displayBuffer = '';
  let inCodeBlock = false;

  for await (const chunk of chatStream(messages, BUILDER_SYSTEM_PROMPT, 2048)) {
    fullResponse += chunk;
    displayBuffer += chunk;

    // Process the buffer to handle code blocks
    while (displayBuffer.length > 0) {
      if (!inCodeBlock) {
        // Look for start of code block
        const codeBlockStart = displayBuffer.indexOf('```');
        if (codeBlockStart === -1) {
          // No code block marker - yield everything except last 3 chars (in case ``` is split)
          if (displayBuffer.length > 3) {
            const safeToYield = displayBuffer.slice(0, -3);
            yield { type: 'text', content: safeToYield };
            displayBuffer = displayBuffer.slice(-3);
          }
          break;
        } else if (codeBlockStart > 0) {
          // Yield text before the code block
          yield { type: 'text', content: displayBuffer.slice(0, codeBlockStart) };
          displayBuffer = displayBuffer.slice(codeBlockStart);
        }
        // Now displayBuffer starts with ```
        inCodeBlock = true;
        displayBuffer = displayBuffer.slice(3); // Remove opening ```
      } else {
        // Inside code block - look for closing ```
        const codeBlockEnd = displayBuffer.indexOf('```');
        if (codeBlockEnd === -1) {
          // Still inside code block, discard content but keep last 3 chars
          displayBuffer = displayBuffer.length > 3 ? displayBuffer.slice(-3) : displayBuffer;
          break;
        } else {
          // Found end of code block
          displayBuffer = displayBuffer.slice(codeBlockEnd + 3);
          inCodeBlock = false;
        }
      }
    }
  }

  // Yield any remaining non-code-block content
  if (!inCodeBlock && displayBuffer.length > 0 && !displayBuffer.includes('```')) {
    yield { type: 'text', content: displayBuffer };
  }

  // Extract profile and clean response
  const updatedProfile = extractProfileFromResponse(fullResponse, currentContext.profile);
  const cleanResponse = stripProfileJsonFromResponse(fullResponse);

  // Check if LLM response indicates we should move to headshot phase
  let finalState = newState;
  if (currentContext.state === 'interviewing' && newState === 'interviewing') {
    if (llmIndicatesComplete(cleanResponse)) {
      finalState = 'headshot';
    }
  }

  yield {
    type: 'done',
    context: {
      state: finalState,
      profile: updatedProfile,
      extractedFromDocuments: currentContext.extractedFromDocuments || !!(documents && documents.length > 0),
    },
    cleanResponse,
  };
}

/**
 * Generate PDF field values from profile
 */
export async function generatePdfFields(profile: BuilderProfile): Promise<string> {
  return transformProfileToPdfFields(profile as Record<string, unknown>);
}

/**
 * Process a builder conversation turn with streaming - CHAT ONLY
 * Does not extract JSON, just streams the conversational response
 * Use extractProfileFromConversation separately for JSON extraction
 */
export async function* processBuilderChatStream(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  currentContext: BuilderContext,
  documents?: DocumentUpload[]
): AsyncGenerator<{ type: 'text'; content: string } | { type: 'done'; state: BuilderState; response: string }> {
  // Check for state transitions
  let newState = currentContext.state;

  if (currentContext.state === 'interviewing' && isGenerationRequest(userMessage)) {
    newState = 'generating';
  }

  if (
    currentContext.state === 'interviewing' &&
    shouldTransitionToHeadshot(userMessage, currentContext.profile)
  ) {
    newState = 'generating';
  }

  // Build messages for Claude
  const messages: ChatMessage[] = [];

  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Build the current message with context
  let textContent = userMessage;

  if (newState === 'generating') {
    textContent += `

[SYSTEM NOTE: The user is ready for the headshot phase. Acknowledge their progress and ask them to upload their photo. Mention they can optionally specify enhancement requests like "reduce shadows" or "soften wrinkles".]`;
  }

  // Build message content - either simple string or array with documents
  if (documents && documents.length > 0) {
    const contentBlocks: (TextContent | DocumentContent)[] = [];

    // Add documents first
    for (const doc of documents) {
      contentBlocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: doc.mediaType,
          data: doc.content,
        },
      });
    }

    // Add text message with document context
    const docNames = documents.map(d => d.filename).join(', ');
    contentBlocks.push({
      type: 'text',
      text: `[User uploaded: ${docNames}]\n\n${textContent}`,
    });

    messages.push({
      role: 'user',
      content: contentBlocks,
    });
  } else {
    messages.push({
      role: 'user',
      content: textContent,
    });
  }

  // Stream response from Claude using chat-only prompt
  let fullResponse = '';

  for await (const chunk of chatStream(messages, BUILDER_CHAT_PROMPT, 2048)) {
    fullResponse += chunk;
    yield { type: 'text', content: chunk };
  }

  // Don't auto-transition state - let user manually click "Generate Card" when ready
  // This keeps the chat open for follow-up questions or edits

  yield {
    type: 'done',
    state: newState,
    response: fullResponse,
  };
}

/**
 * Update profile data from the latest conversation turn
 * This is an incremental update - it receives current profile + latest turn and updates only changed fields
 */
export async function updateProfileFromTurn(
  currentProfile: BuilderProfile,
  latestUserMessage: string,
  latestAssistantResponse: string,
  documents?: DocumentUpload[]
): Promise<BuilderProfile> {
  // Build the message with current profile and latest turn
  const messages: ChatMessage[] = [];

  // First message: provide current profile state
  messages.push({
    role: 'user',
    content: `CURRENT PROFILE STATE:\n${JSON.stringify(currentProfile, null, 2)}`,
  });

  messages.push({
    role: 'assistant',
    content: 'I have the current profile state. Please provide the new conversation exchange to analyze for updates.',
  });

  // Second message: provide the latest turn (with documents if any)
  if (documents && documents.length > 0) {
    const contentBlocks: (TextContent | DocumentContent)[] = [];

    // Add documents
    for (const doc of documents) {
      contentBlocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: doc.mediaType,
          data: doc.content,
        },
      });
    }

    // Add the conversation exchange text
    const docNames = documents.map(d => d.filename).join(', ');
    contentBlocks.push({
      type: 'text',
      text: `NEW CONVERSATION EXCHANGE:

[Attached documents: ${docNames}]

USER: ${latestUserMessage}

ASSISTANT: ${latestAssistantResponse}

Please update the profile based on any new information in this exchange and the attached documents.`,
    });

    messages.push({
      role: 'user',
      content: contentBlocks,
    });
  } else {
    messages.push({
      role: 'user',
      content: `NEW CONVERSATION EXCHANGE:

USER: ${latestUserMessage}

ASSISTANT: ${latestAssistantResponse}

Please update the profile based on any new information in this exchange.`,
    });
  }

  // Get update response
  const response = await chat(messages, BUILDER_UPDATE_PROMPT, 4096);

  // Parse JSON from response
  try {
    // Remove any markdown formatting that might have slipped through
    let jsonStr = response.content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const updated = JSON.parse(jsonStr);

    // Defensive merge: start with current profile, overlay with updates
    // This ensures we don't accidentally lose fields the model omitted
    const merged = { ...currentProfile };
    for (const [key, value] of Object.entries(updated)) {
      // Only update if the model returned a non-null value for this field
      if (value !== null && value !== undefined) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
    return merged;
  } catch (e) {
    console.warn('Failed to parse update JSON:', e);
    console.warn('Raw response:', response.content);
    return currentProfile;
  }
}
