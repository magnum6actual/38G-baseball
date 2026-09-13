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
