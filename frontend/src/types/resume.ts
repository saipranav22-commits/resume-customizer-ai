export interface ContactInfo {
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
}

export interface ExperienceItem {
  role: string;
  company: string;
  duration?: string | null;
  location?: string | null;
  bullets: string[];
  original_bullets?: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  year?: string | null;
  details?: string | null;
}

export interface ProjectItem {
  name: string;
  technologies: string[];
  bullets: string[];
  link?: string | null;
}

export interface SkillsCategorized {
  matching_skills: string[];
  additional_skills: string[];
}

export interface MissingKeywordSuggestion {
  keyword: string;
  category: string;
  recommendation: string;
  context: string;
}

export interface AtsCompatibility {
  score: number;
  strengths: string[];
  improvements: string[];
}

export interface CoverLetterRequest {
  candidate_name: string;
  contact_info: ContactInfo;
  target_role?: string;
  company_name?: string;
  cover_letter_text: string;
}

export interface TailoredResumeResponse {
  candidate_name: string;
  contact_info: ContactInfo;
  original_summary?: string | null;
  tailored_summary: string;
  skills: SkillsCategorized;
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: string[];
  missing_keywords: MissingKeywordSuggestion[];
  match_score: number;
  ats_compatibility: AtsCompatibility;
  raw_parsed_resume_text?: string | null;
  job_description_summary?: string | null;
  generated_cover_letter?: string | null;
  is_llm_generated?: boolean;
  customization_engine?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  llm_provider: string;
  llm_configured: boolean;
  gemini_key_present: boolean;
}

// --- Phase 5A: Authentication & History Types ---

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface CustomizationHistoryItem {
  id: string;
  user_id: string;
  resume_id?: string | null;
  title: string;
  target_role?: string;
  match_score?: number;
  ats_score?: number;
  customization_engine: string;
  is_llm_generated: boolean;
  created_at: string;
}

export interface CustomizationHistoryDetail extends CustomizationHistoryItem {
  job_description: string;
  tailored_result: TailoredResumeResponse;
}

export interface SaveHistoryRequest {
  title: string;
  job_description: string;
  target_role?: string;
  tailored_result: TailoredResumeResponse;
  resume_id?: string | null;
}
