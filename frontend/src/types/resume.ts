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

// --- Phase 5C: Advanced AI Resume Optimization Types ---

export interface JobDescriptionAnalysis {
  target_role?: string | null;
  required_skills: string[];
  preferred_skills: string[];
  tools_frameworks: string[];
  experience_level?: string | null;
  education_requirement?: string | null;
  responsibilities: string[];
  keywords: string[];
}

export interface MatchScoreBreakdown {
  overall_score: number;
  required_skill_score: number;
  preferred_skill_score: number;
  experience_score: number;
  responsibility_score: number;
  keyword_score: number;
  structure_score: number;
  factor_weights: Record<string, number>;
  explanation: string;
  disclaimer: string;
}

export interface OptimizationRecommendation {
  issue: string;
  requirement: string;
  evidence: string;
  proposed_improvement: string;
  priority: 'high' | 'medium' | 'low';
  requires_user_confirmation: boolean;
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
  // Phase 5C: Explainable Optimization & Analysis Fields
  job_analysis?: JobDescriptionAnalysis | null;
  match_breakdown?: MatchScoreBreakdown | null;
  recommendations?: OptimizationRecommendation[];
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
  // Phase 5B: Versioning metadata (optional for backward compatibility)
  version_name?: string;
  version_number?: number;
  parent_id?: string | null;
  root_id?: string | null;
  version_tags?: string[];
  version_notes?: string | null;
  is_starred?: boolean;
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
  // Phase 5B optional versioning fields
  version_name?: string;
  parent_id?: string | null;
  version_tags?: string[];
  version_notes?: string | null;
}

// --- Phase 5B: Explicit Version Management Types ---

export type VersionSummary = CustomizationHistoryItem;
export type VersionDetail = CustomizationHistoryDetail;

export type CreateVersionRequest = SaveHistoryRequest;

export interface ForkVersionRequest {
  new_version_name: string;
  new_title?: string;
  version_notes?: string;
  version_tags?: string[];
}

export interface UpdateVersionMetadataRequest {
  version_name?: string;
  title?: string;
  version_notes?: string;
  version_tags?: string[];
  is_starred?: boolean;
}

export interface FetchHistoryOptions {
  resume_id?: string;
  root_id?: string;
  is_starred?: boolean;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CompareVersionsRequest {
  version_a_id: string;
  version_b_id: string;
}

export interface ExperienceDiff {
  role: string;
  company: string;
  added_bullets: string[];
  removed_bullets: string[];
  unchanged_bullets: string[];
}

export interface VersionComparisonResponse {
  version_a_id: string;
  version_b_id: string;
  version_a_name?: string | null;
  version_b_name?: string | null;
  version_a_number: number;
  version_b_number: number;

  match_score_a?: number | null;
  match_score_b?: number | null;
  match_score_delta?: number | null;

  ats_score_a?: number | null;
  ats_score_b?: number | null;
  ats_score_delta?: number | null;

  summary_a?: string | null;
  summary_b?: string | null;
  summary_changed: boolean;

  added_skills: string[];
  removed_skills: string[];
  shared_skills: string[];

  experience_diffs: ExperienceDiff[];

  title_a?: string | null;
  title_b?: string | null;
  created_at_a?: string | null;
  created_at_b?: string | null;
}
