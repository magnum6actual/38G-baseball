// Officer profile data types

export interface Officer {
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
  created_at: string;
  updated_at: string;
}

export interface OfficerSummary {
  id: string;
  name: string;
  rank: string;
  unit: string;
  summary: string | null;
  photoUrl: string | null;
}

export interface Embedding {
  id: number;
  officer_id: string;
  text_content: string;
  embedding: Buffer;
}

export interface Conversation {
  id: string;
  type: 'search' | 'builder';
  officer_id: string | null;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// API request/response types

export interface SearchChatRequest {
  conversationId?: string;
  message: string;
}

export interface SearchChatResponse {
  conversationId: string;
  response: string;
  officers: OfficerSummary[];
}

export interface BuilderChatRequest {
  conversationId?: string;
  message: string;
  documents?: string[]; // base64 encoded files
}

export interface BuilderChatResponse {
  conversationId: string;
  response: string;
  state: 'interviewing' | 'headshot' | 'generating' | 'complete';
  profile: Record<string, unknown> | null;
}

export interface HeadshotRequest {
  subjectImage: string; // base64
  name: string;
  rank: string;
  enhancements?: string;
}

export interface HeadshotResponse {
  processedImage: string; // base64
  success: boolean;
  error?: string;
}

// Structured officer data from fictional_officers.json
export interface FictionalOfficer {
  id: string;
  name: string;
  rank: string;
  unit: string;
  date_assigned: string;
  position_title: string;
  mos_skill: string;
  skill_plain: string;
  residence: string;
  civilian_occupation: string;
  additional_info: string;
  skills: string[];
  deployments: {
    dates: string;
    mission: string;
    location: string;
    position: string;
  }[];
  exercises: {
    event: string;
    position_dates: string;
  }[];
  prior_experience: {
    dates: string;
    location: string;
    position: string;
  }[];
  awards_prior: string;
  awards_38g: string;
  credentials: string;
  education: string;
  training_38g: {
    dates: string;
    course: string;
  }[];
  clearance_level: string;
  clearance_exp: string;
  passport_personal: string;
  passport_official: string;
  languages: {
    language: string;
    listening: string;
    reading: string;
    speaking: string;
  }[];
}
