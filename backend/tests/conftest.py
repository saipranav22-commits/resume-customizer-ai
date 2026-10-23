import sys
from pathlib import Path
import pytest

# Add backend directory to sys.path so 'app' is importable
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.models.schemas import (
    TailoredResumeResponse,
    ContactInfo,
    SkillsCategorized,
    ExperienceItem,
    EducationItem,
    ProjectItem,
    MissingKeywordSuggestion,
    AtsCompatibility
)

@pytest.fixture
def sample_tailored_resume():
    return TailoredResumeResponse(
        candidate_name="Alex Morgan",
        contact_info=ContactInfo(
            email="alex.morgan@example.com",
            phone="+1 555-0199",
            location="San Francisco, CA",
            linkedin="https://linkedin.com/in/alexmorgan",
            github="https://github.com/alexmorgan"
        ),
        original_summary="Full Stack Software Engineer with 4 years experience.",
        tailored_summary="Results-oriented Senior Full Stack Engineer specializing in Next.js, Python FastAPI, and cloud-native systems. Proven track record of architecting scalable applications and integrating AI models.",
        skills=SkillsCategorized(
            matching_skills=["Next.js", "React", "Python", "FastAPI", "TypeScript", "REST APIs"],
            additional_skills=["Docker", "PostgreSQL", "Git", "CI/CD"]
        ),
        experience=[
            ExperienceItem(
                role="Senior Full Stack Engineer",
                company="TechCorp Solutions",
                duration="2022 - Present",
                location="San Francisco, CA",
                bullets=[
                    "Architected high-throughput REST APIs using FastAPI handling 500k+ daily requests.",
                    "Built modern, responsive user interfaces with Next.js App Router and TypeScript, improving user engagement by 35%."
                ]
            )
        ],
        education=[
            EducationItem(
                degree="B.S. in Computer Science",
                institution="University of California, Berkeley",
                year="2020",
                details="Graduated with Honors"
            )
        ],
        projects=[
            ProjectItem(
                name="AI Resume Tailoring Engine",
                technologies=["FastAPI", "Next.js", "Gemini API"],
                bullets=["Developed an automated LLM pipeline to analyze JDs and tailor resume bullets."],
                link="https://github.com/alexmorgan/resume-ai"
            )
        ],
        certifications=["AWS Certified Solutions Architect"],
        missing_keywords=[
            MissingKeywordSuggestion(
                keyword="Kubernetes",
                category="Infrastructure",
                recommendation="If you have container orchestration experience, consider highlighting container deployment details.",
                context="Job description requires Kubernetes deployment expertise."
            )
        ],
        match_score=88,
        ats_compatibility=AtsCompatibility(
            score=92,
            strengths=["Strong action verbs", "Clear chronological progression", "Direct alignment with tech stack"],
            improvements=["Consider adding quantifiable metrics to project bullets"]
        ),
        raw_parsed_resume_text="Alex Morgan\nalex.morgan@example.com\nSoftware Engineer...",
        job_description_summary="Seeking Senior Full Stack Developer proficient in Next.js, FastAPI, and Cloud infrastructure."
    )
