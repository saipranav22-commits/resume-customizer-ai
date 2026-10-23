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
}

export interface HealthResponse {
  status: string;
  version: string;
  llm_provider: string;
  llm_configured: boolean;
  gemini_key_present: boolean;
}
