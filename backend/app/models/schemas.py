from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ContactInfo(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None

class ExperienceItem(BaseModel):
    role: str
    company: str
    duration: Optional[str] = None
    location: Optional[str] = None
    bullets: List[str] = Field(default_factory=list, description="Tailored experience bullet points aligning with JD without fabricating accomplishments")
    original_bullets: Optional[List[str]] = Field(default_factory=list, description="Original bullet points before tailoring for diff comparison")

class EducationItem(BaseModel):
    degree: str
    institution: str
    year: Optional[str] = None
    details: Optional[str] = None

class ProjectItem(BaseModel):
    name: str
    technologies: List[str] = Field(default_factory=list)
    bullets: List[str] = Field(default_factory=list)
    link: Optional[str] = None

class SkillsCategorized(BaseModel):
    matching_skills: List[str] = Field(
        default_factory=list,
        description="Candidate's genuine skills that directly match JD requirements"
    )
    additional_skills: List[str] = Field(
        default_factory=list,
        description="Candidate's genuine skills present in resume that are complementary"
    )

class MissingKeywordSuggestion(BaseModel):
    keyword: str
    category: str = Field(description="Skill category, e.g., 'Tool', 'Framework', 'Domain', 'Certification'")
    recommendation: str = Field(description="Advisory guidance on how the candidate can legitimately gain or demonstrate this keyword if applicable")
    context: str = Field(description="Where and why this keyword appeared in the job description")

class AtsCompatibility(BaseModel):
    score: int = Field(ge=0, le=100, description="Estimated ATS compatibility score from 0 to 100")
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)

# --- Phase 5C: Advanced AI Resume Optimization Schemas ---

class JobDescriptionAnalysis(BaseModel):
    target_role: Optional[str] = Field(default=None, description="Extracted target job role or title")
    required_skills: List[str] = Field(default_factory=list, description="Mandatory technical competencies and skills required by JD")
    preferred_skills: List[str] = Field(default_factory=list, description="Nice-to-have or preferred skills and bonus qualifications")
    tools_frameworks: List[str] = Field(default_factory=list, description="Specific tools, libraries, frameworks and platforms mentioned")
    experience_level: Optional[str] = Field(default=None, description="Required experience level or years of experience if specified")
    education_requirement: Optional[str] = Field(default=None, description="Educational degrees or credential requirements if stated")
    responsibilities: List[str] = Field(default_factory=list, description="Core responsibilities and duties defined in the role")
    keywords: List[str] = Field(default_factory=list, description="Important domain keywords and concepts critical for matching")

class MatchScoreBreakdown(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    required_skill_score: int = Field(ge=0, le=100, description="Coverage of strictly required skills from the JD")
    preferred_skill_score: int = Field(ge=0, le=100, description="Coverage of nice-to-have/preferred skills from the JD")
    experience_score: int = Field(ge=0, le=100, description="Alignment with required seniority and demonstrated roles")
    responsibility_score: int = Field(ge=0, le=100, description="Demonstrated alignment with role duties and project scopes")
    keyword_score: int = Field(ge=0, le=100, description="Density and contextual relevance of key industry keywords")
    structure_score: int = Field(ge=0, le=100, description="Clarity, standard section headings, and ATS-parseability")
    factor_weights: Dict[str, float] = Field(
        default_factory=lambda: {
            "required_skills": 0.35,
            "preferred_skills": 0.15,
            "experience": 0.20,
            "responsibilities": 0.15,
            "keyword_coverage": 0.10,
            "structure": 0.05
        },
        description="Explicit weights used to calculate the overall score"
    )
    explanation: str = Field(description="Transparent explanation of how scores were derived based on verifiable evidence")
    disclaimer: str = Field(
        default="Match scores indicate semantic and structural alignment with the provided job description. They do not simulate or guarantee proprietary ATS screening decisions or employer interview outcomes."
    )

class OptimizationRecommendation(BaseModel):
    issue: str = Field(description="Description of the identified alignment or phrasing gap")
    requirement: str = Field(description="The specific JD requirement or standard this addresses")
    evidence: str = Field(description="Evidence or missing evidence found in the resume")
    proposed_improvement: str = Field(description="Concrete, actionable improvement adhering to factual truth")
    priority: str = Field(default="medium", description="Priority level: 'high', 'medium', or 'low'")
    requires_user_confirmation: bool = Field(
        default=False,
        description="True if recommendation involves claims that must be confirmed by the candidate before inclusion"
    )

class CoverLetterRequest(BaseModel):
    candidate_name: str
    contact_info: ContactInfo
    target_role: Optional[str] = "Position"
    company_name: Optional[str] = "Hiring Team"
    cover_letter_text: str

class TailoredResumeResponse(BaseModel):
    candidate_name: str
    contact_info: ContactInfo
    original_summary: Optional[str] = None
    tailored_summary: str = Field(description="Polished professional summary tailored specifically to the target role")
    skills: SkillsCategorized
    experience: List[ExperienceItem]
    education: List[EducationItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    missing_keywords: List[MissingKeywordSuggestion] = Field(
        default_factory=list,
        description="Missing keywords isolated into an advisory section. Never mixed into actual candidate credentials."
    )
    match_score: int = Field(ge=0, le=100, description="Match percentage between original resume qualifications and JD")
    ats_compatibility: AtsCompatibility
    raw_parsed_resume_text: Optional[str] = None
    job_description_summary: Optional[str] = None
    generated_cover_letter: Optional[str] = Field(
        default=None,
        description="Tailored cover letter aligning candidate's background with the job description"
    )
    is_llm_generated: bool = Field(
        default=True,
        description="True if generated by real LLM, False if produced by deterministic analyzer"
    )
    customization_engine: str = Field(
        default="gemini",
        description="Engine used: 'gemini' or 'deterministic_fallback'"
    )
    # Phase 5C: Explainable Optimization & Analysis Fields
    job_analysis: Optional[JobDescriptionAnalysis] = Field(
        default=None,
        description="Structured extraction of job description requirements and preferences"
    )
    match_breakdown: Optional[MatchScoreBreakdown] = Field(
        default=None,
        description="Explainable match score breakdown across tested evaluation factors"
    )
    recommendations: List[OptimizationRecommendation] = Field(
        default_factory=list,
        description="Prioritized, evidence-grounded recommendations for resume optimization"
    )

class HealthResponse(BaseModel):
    status: str
    version: str
    llm_provider: Optional[str] = None
    llm_configured: Optional[bool] = None
    gemini_key_present: Optional[bool] = None

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None


# --- Phase 5A: Authentication & Resume History Schemas ---

class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None

class CustomizationHistoryItem(BaseModel):
    id: str
    user_id: str
    resume_id: Optional[str] = None
    title: str
    target_role: Optional[str] = None
    match_score: Optional[int] = None
    ats_score: Optional[int] = None
    customization_engine: str = 'gemini'
    is_llm_generated: bool = True
    created_at: str
    # Phase 5B: Version metadata (backward-compatible defaults)
    version_name: Optional[str] = None
    version_number: int = 1
    parent_id: Optional[str] = None
    root_id: Optional[str] = None
    version_tags: List[str] = Field(default_factory=list)
    version_notes: Optional[str] = None
    is_starred: bool = False

class CustomizationHistoryDetail(CustomizationHistoryItem):
    job_description: str
    tailored_result: TailoredResumeResponse

class SaveHistoryRequest(BaseModel):
    title: str
    job_description: str
    target_role: Optional[str] = None
    tailored_result: TailoredResumeResponse
    resume_id: Optional[str] = None
    # Phase 5B optional versioning fields
    version_name: Optional[str] = None
    parent_id: Optional[str] = None
    version_tags: List[str] = Field(default_factory=list)
    version_notes: Optional[str] = None

class SavedResumeItem(BaseModel):
    id: str
    user_id: str
    title: str
    original_filename: Optional[str] = None
    candidate_name: Optional[str] = None
    created_at: str


# --- Phase 5B: Explicit Version Management Schemas ---

class VersionSummary(CustomizationHistoryItem):
    """Semantic alias for CustomizationHistoryItem representing a version snapshot."""
    pass

class VersionDetail(CustomizationHistoryDetail):
    """Semantic alias for CustomizationHistoryDetail representing full version snapshot payload."""
    pass

class CreateVersionRequest(SaveHistoryRequest):
    """Request schema for explicitly creating a new version revision in a tree."""
    pass

class ForkVersionRequest(BaseModel):
    """Request schema for duplicating / branching an existing version snapshot."""
    new_version_name: str = Field(..., min_length=1, max_length=120)
    new_title: Optional[str] = Field(None, max_length=120)
    version_notes: Optional[str] = None
    version_tags: List[str] = Field(default_factory=list)

class UpdateVersionMetadataRequest(BaseModel):
    """Request schema for updating mutable metadata of an immutable version snapshot."""
    version_name: Optional[str] = Field(None, min_length=1, max_length=120)
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    version_notes: Optional[str] = None
    version_tags: Optional[List[str]] = None
    is_starred: Optional[bool] = None

class CompareVersionsRequest(BaseModel):
    """Request schema for comparing two saved version snapshots."""
    version_a_id: str = Field(..., description="ID of the baseline version (older/source)")
    version_b_id: str = Field(..., description="ID of the comparison version (newer/target)")

class ExperienceDiff(BaseModel):
    """Structured diff of experience bullet points within a matching role/company."""
    role: str
    company: str
    added_bullets: List[str] = Field(default_factory=list)
    removed_bullets: List[str] = Field(default_factory=list)
    unchanged_bullets: List[str] = Field(default_factory=list)

class VersionComparisonResponse(BaseModel):
    """Structured, deterministic comparison between two version snapshots."""
    version_a_id: str
    version_b_id: str
    version_a_name: Optional[str] = None
    version_b_name: Optional[str] = None
    version_a_number: int = 1
    version_b_number: int = 1

    # Score comparison
    match_score_a: Optional[int] = None
    match_score_b: Optional[int] = None
    match_score_delta: Optional[int] = None

    ats_score_a: Optional[int] = None
    ats_score_b: Optional[int] = None
    ats_score_delta: Optional[int] = None

    # Summary comparison
    summary_a: Optional[str] = None
    summary_b: Optional[str] = None
    summary_changed: bool = False

    # Skills comparison
    added_skills: List[str] = Field(default_factory=list, description="Skills present in version B but not in version A")
    removed_skills: List[str] = Field(default_factory=list, description="Skills present in version A but not in version B")
    shared_skills: List[str] = Field(default_factory=list, description="Skills present in both versions")

    # Experience bullet changes
    experience_diffs: List[ExperienceDiff] = Field(default_factory=list)

    # Metadata
    title_a: Optional[str] = None
    title_b: Optional[str] = None
    created_at_a: Optional[str] = None
    created_at_b: Optional[str] = None


# --- Phase 6.2: Interactive Editor, AI Improve & Live Re-check Schemas ---

class ImproveTextRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=2000, description="The original text to improve")
    section_type: str = Field(default="experience", description="Section type: 'summary', 'experience', 'project'")
    job_description: str = Field(..., min_length=20, description="Target job description for alignment")
    context: Optional[str] = Field(default=None, description="Optional surrounding context like role, company, or technologies")

class ImproveTextResponse(BaseModel):
    original_text: str
    improved_text: str
    rationale: str
    impact_keywords: List[str] = Field(default_factory=list)
    is_llm_generated: bool = True

class RecheckScoreRequest(BaseModel):
    resume_data: TailoredResumeResponse = Field(..., description="The current working draft resume")
    job_description: str = Field(..., min_length=20, description="Target job description")
    previous_score: Optional[int] = Field(default=None, ge=0, le=100, description="Previous overall match score")
    previous_breakdown: Optional[MatchScoreBreakdown] = Field(default=None, description="Previous score breakdown for delta calculations")

class RecheckScoreResponse(BaseModel):
    match_score: int = Field(ge=0, le=100)
    ats_compatibility: AtsCompatibility
    match_breakdown: MatchScoreBreakdown
    recommendations: List[OptimizationRecommendation] = Field(default_factory=list)
    missing_keywords: List[MissingKeywordSuggestion] = Field(default_factory=list)
    score_delta: int = Field(default=0, description="Difference between new score and previous score")
    factor_deltas: Dict[str, int] = Field(default_factory=dict, description="Per-factor score deltas")
    is_stale: bool = False
