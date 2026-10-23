from typing import List, Optional
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

class HealthResponse(BaseModel):
    status: str
    version: str
    llm_provider: str
    llm_configured: bool
    gemini_key_present: bool

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
