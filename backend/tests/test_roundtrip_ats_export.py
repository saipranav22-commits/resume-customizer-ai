import pytest
from app.models.schemas import (
    TailoredResumeResponse,
    ContactInfo,
    ExperienceItem,
    EducationItem,
    ProjectItem,
    SkillsCategorized,
    AtsCompatibility,
    MissingKeywordSuggestion,
    RecheckScoreRequest,
)
from app.services.exporter import (
    export_pdf,
    export_docx,
    export_txt,
    is_fresher_profile,
    clean_pdf_text,
)
from app.services.parser import parse_pdf_bytes, parse_docx_bytes
from app.services.audit import audit_resume_quality, calculate_ats_quality_assessment
from app.services.customizer import recheck_draft_score
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Helper fixture builders
def create_base_resume(
    candidate_name="Sarah Connor",
    email="sarah.connor@example.com",
    phone="+1 (555) 234-5678",
    role="Senior Backend Engineer",
    company="Cyberdyne Systems",
    bullets=None,
    skills=None,
    projects=None,
    education=None,
    certifications=None
) -> TailoredResumeResponse:
    if bullets is None:
        bullets = [
            "Architected distributed microservices in Go and PostgreSQL supporting 10M daily events.",
            "Engineered automated CI/CD deployment pipelines on AWS Kubernetes cluster reducing release lead time."
        ]
    if skills is None:
        skills = SkillsCategorized(
            matching_skills=["Python", "Go", "PostgreSQL", "Docker", "Kubernetes", "AWS"],
            additional_skills=["Redis", "Kafka", "GraphQL", "Terraform", "Linux"]
        )
    if projects is None:
        projects = [
            ProjectItem(
                name="Cloud Observability Mesh",
                technologies=["Go", "Prometheus", "Grafana"],
                bullets=["Built real-time telemetry pipeline to ingest metrics across 50 microservices."]
            )
        ]
    if education is None:
        education = [
            EducationItem(
                degree="B.S. in Computer Science",
                institution="Stanford University",
                year="2018",
                details="Graduated with Honors; Focus on Distributed Systems."
            )
        ]
    if certifications is None:
        certifications = ["AWS Certified Solutions Architect - Associate", "CKA: Certified Kubernetes Administrator"]

    return TailoredResumeResponse(
        candidate_name=candidate_name,
        contact_info=ContactInfo(
            email=email,
            phone=phone,
            location="San Francisco, CA",
            linkedin="https://linkedin.com/in/sarah-connor",
            github="https://github.com/sarah-connor"
        ),
        tailored_summary="Accomplished backend systems architect with 6+ years of production experience building high-throughput distributed applications.",
        skills=skills,
        experience=[
            ExperienceItem(
                role=role,
                company=company,
                duration="2021 - Present",
                location="San Francisco, CA",
                bullets=bullets,
                original_bullets=bullets
            )
        ] if role else [],
        education=education,
        projects=projects,
        certifications=certifications,
        match_score=88,
        ats_compatibility=AtsCompatibility(
            score=92,
            strengths=["Clear heading hierarchy", "Verified competencies"],
            improvements=[]
        )
    )

# ============================================================================
# 1. Freshers vs Experienced Adaptive Section Ordering
# ============================================================================

def test_fresher_adaptive_layout_roundtrip():
    """Verify fresher layout prioritizes projects and education ahead of experience."""
    fresher = create_base_resume(
        candidate_name="Alex Fresher",
        role="Software Engineering Intern",
        company="Tech Innovators Lab",
        bullets=["Assisted team in developing React components and unit test suites."]
    )
    assert is_fresher_profile(fresher) is True

    # 1. TXT export
    txt = export_txt(fresher)
    assert "KEY PROJECTS" in txt
    assert "EDUCATION" in txt
    assert "PROFESSIONAL EXPERIENCE" in txt
    # In fresher layout, KEY PROJECTS appears BEFORE PROFESSIONAL EXPERIENCE
    proj_idx = txt.index("KEY PROJECTS")
    exp_idx = txt.index("PROFESSIONAL EXPERIENCE")
    assert proj_idx < exp_idx, "Expected KEY PROJECTS before PROFESSIONAL EXPERIENCE for fresher"

    # 2. PDF round-trip text extraction
    pdf_bytes = export_pdf(fresher)
    assert len(pdf_bytes) > 1000
    extracted_pdf = parse_pdf_bytes(pdf_bytes)
    assert "Alex Fresher" in extracted_pdf
    assert "alex.connor@example.com" not in extracted_pdf  # Sanity check
    assert "sarah.connor@example.com" in extracted_pdf or "Alex Fresher" in extracted_pdf
    assert "KEY PROJECTS" in extracted_pdf
    assert "EDUCATION" in extracted_pdf
    assert "Cloud Observability Mesh" in extracted_pdf

    # 3. DOCX round-trip text extraction
    docx_bytes = export_docx(fresher)
    assert len(docx_bytes) > 1000
    extracted_docx = parse_docx_bytes(docx_bytes)
    assert "Alex Fresher" in extracted_docx
    assert "KEY PROJECTS" in extracted_docx
    assert "Cloud Observability Mesh" in extracted_docx

def test_experienced_candidate_layout_roundtrip():
    """Verify experienced candidate layout prioritizes professional experience before projects."""
    experienced = create_base_resume(candidate_name="Elena Rostova", role="Principal Architect")
    assert is_fresher_profile(experienced) is False

    txt = export_txt(experienced)
    exp_idx = txt.index("PROFESSIONAL EXPERIENCE")
    proj_idx = txt.index("KEY PROJECTS")
    assert exp_idx < proj_idx, "Expected PROFESSIONAL EXPERIENCE before KEY PROJECTS for experienced candidate"

    pdf_bytes = export_pdf(experienced)
    extracted_pdf = parse_pdf_bytes(pdf_bytes)
    assert "Elena Rostova" in extracted_pdf
    assert "PROFESSIONAL EXPERIENCE" in extracted_pdf
    assert "Principal Architect" in extracted_pdf

    docx_bytes = export_docx(experienced)
    extracted_docx = parse_docx_bytes(docx_bytes)
    assert "Elena Rostova" in extracted_docx
    assert "Principal Architect" in extracted_docx

# ============================================================================
# 2. Long Resumes & Multi-Page Flow
# ============================================================================

def test_long_resume_multi_page_roundtrip():
    """Verify long resume flows across multiple pages without clipping, truncation, or layout crash."""
    long_bullets = [
        f"Spearheaded enterprise infrastructure initiative {i}: optimized microservices latency by 35ms across {i*10} container nodes."
        for i in range(1, 15)
    ]
    long_experience = [
        ExperienceItem(
            role=f"Staff Engineer Level {i}",
            company=f"Global Enterprise Tech {i}",
            duration=f"201{i} - 201{i+2}",
            bullets=long_bullets[:4]
        )
        for i in range(1, 5)
    ]
    resume = create_base_resume(candidate_name="David Longfellow")
    resume.experience = long_experience

    # Export PDF
    pdf_bytes = export_pdf(resume)
    assert len(pdf_bytes) > 2000
    extracted_pdf = parse_pdf_bytes(pdf_bytes)
    assert "David Longfellow" in extracted_pdf
    assert "Staff Engineer Level 1" in extracted_pdf
    assert "Staff Engineer Level 4" in extracted_pdf
    assert "Global Enterprise Tech 4" in extracted_pdf

    # Export DOCX
    docx_bytes = export_docx(resume)
    extracted_docx = parse_docx_bytes(docx_bytes)
    assert "David Longfellow" in extracted_docx
    assert "Staff Engineer Level 4" in extracted_docx

# ============================================================================
# 3. Missing Optional Sections & Empty Sections Guard
# ============================================================================

def test_missing_optional_sections_roundtrip():
    """Verify resume with no certifications or projects exports cleanly without empty section headings."""
    resume = create_base_resume(candidate_name="Minimalist Mark")
    resume.projects = []
    resume.certifications = []

    txt = export_txt(resume)
    assert "KEY PROJECTS" not in txt
    assert "CERTIFICATIONS" not in txt
    assert "PROFESSIONAL EXPERIENCE" in txt

    pdf_bytes = export_pdf(resume)
    extracted_pdf = parse_pdf_bytes(pdf_bytes)
    assert "Minimalist Mark" in extracted_pdf
    assert "KEY PROJECTS" not in extracted_pdf
    assert "CERTIFICATIONS" not in extracted_pdf

    docx_bytes = export_docx(resume)
    extracted_docx = parse_docx_bytes(docx_bytes)
    assert "Minimalist Mark" in extracted_docx
    assert "KEY PROJECTS" not in extracted_docx
    assert "CERTIFICATIONS" not in extracted_docx

# ============================================================================
# 4. Multiple Experience Entries & Logical Reading Order
# ============================================================================

def test_multiple_experience_entries_reading_order():
    """Verify multiple reverse-chronological experience entries maintain exact logical order."""
    resume = create_base_resume(candidate_name="Chronological Chloe")
    resume.experience = [
        ExperienceItem(role="Lead Engineer", company="Current Corp", duration="2023 - Present", bullets=["Led team of 8."]),
        ExperienceItem(role="Senior Engineer", company="Middle Corp", duration="2020 - 2023", bullets=["Built payment services."]),
        ExperienceItem(role="Junior Engineer", company="First Corp", duration="2018 - 2020", bullets=["Wrote unit tests."])
    ]

    pdf_bytes = export_pdf(resume)
    extracted_pdf = parse_pdf_bytes(pdf_bytes)
    idx_curr = extracted_pdf.index("Current Corp")
    idx_mid = extracted_pdf.index("Middle Corp")
    idx_first = extracted_pdf.index("First Corp")
    assert idx_curr < idx_mid < idx_first, "Experience items must preserve strict chronological sequence in PDF"

    docx_bytes = export_docx(resume)
    extracted_docx = parse_docx_bytes(docx_bytes)
    idx_d_curr = extracted_docx.index("Current Corp")
    idx_d_mid = extracted_docx.index("Middle Corp")
    idx_d_first = extracted_docx.index("First Corp")
    assert idx_d_curr < idx_d_mid < idx_d_first, "Experience items must preserve strict chronological sequence in DOCX"

# ============================================================================
# 5. Extensive Technical Skills Density
# ============================================================================

def test_extensive_technical_skills_density():
    """Verify dense list of 30+ skills renders without clipping or crashing ReportLab."""
    many_skills = [
        "Python", "TypeScript", "Go", "Java", "C++", "Rust", "FastAPI", "React", "Next.js",
        "Django", "PostgreSQL", "MySQL", "Redis", "MongoDB", "Cassandra", "Docker", "Kubernetes",
        "Helm", "Terraform", "AWS", "GCP", "Azure", "Kafka", "RabbitMQ", "GraphQL", "REST APIs",
        "CI/CD", "Git", "Linux", "Prometheus", "Grafana"
    ]
    resume = create_base_resume(candidate_name="Polyglot Pete")
    resume.skills.matching_skills = many_skills[:15]
    resume.skills.additional_skills = many_skills[15:]

    pdf_bytes = export_pdf(resume)
    extracted_pdf = parse_pdf_bytes(pdf_bytes)
    assert "Polyglot Pete" in extracted_pdf
    assert "Kubernetes" in extracted_pdf
    assert "Prometheus" in extracted_pdf

    docx_bytes = export_docx(resume)
    extracted_docx = parse_docx_bytes(docx_bytes)
    assert "Kubernetes" in extracted_docx
    assert "Grafana" in extracted_docx

# ============================================================================
# 6. Unusual But Valid Characters (XML & Unicode Escaping)
# ============================================================================

def test_unusual_characters_xml_escaping():
    """Verify special XML characters (&, <, >), curly quotes, em-dashes, and accents render safely."""
    special_name = "Renée D'Souza & Associates"
    resume = create_base_resume(
        candidate_name=special_name,
        role="R&D Lead <Systems & Architecture>",
        company="AT&T Labs & Bellcore",
        bullets=[
            "Engineered C++ & Python core services where latency was < 10ms and reliability > 99.99%.",
            'Demonstrated "best-of-breed" algorithms—slashing overhead by 40% across all nodes.'
        ]
    )

    # Test clean_pdf_text helper directly
    raw = "R&D <Systems> & Reliability > 99%"
    cleaned = clean_pdf_text(raw)
    assert "&amp;" in cleaned
    assert "&lt;" in cleaned
    assert "&gt;" in cleaned

    # Test PDF build (must not raise ReportLab XML parsing error)
    pdf_bytes = export_pdf(resume)
    assert len(pdf_bytes) > 1000
    extracted_pdf = parse_pdf_bytes(pdf_bytes)
    assert "Ren" in extracted_pdf
    assert "AT&T" in extracted_pdf or "AT&amp;T" in extracted_pdf or "Bellcore" in extracted_pdf

    # Test DOCX build
    docx_bytes = export_docx(resume)
    extracted_docx = parse_docx_bytes(docx_bytes)
    assert "AT&T" in extracted_docx or "Bellcore" in extracted_docx

# ============================================================================
# 7. Deterministic Resume Quality Audit Unit Tests
# ============================================================================

def test_audit_identifies_errors_warnings_suggestions():
    """Verify audit engine accurately categorizes critical errors, warnings, and suggestions."""
    # Defective resume: missing email, missing name, first-person pronouns, duplicate skills
    bad_resume = create_base_resume(
        candidate_name="Untitled",
        email="",  # Critical error
        phone="",  # Warning
        bullets=["I personally wrote all the code and worked on the database."] # Pronoun & weak starter
    )
    bad_resume.skills.matching_skills = ["Python", "python", "Docker"] # Duplicate skill
    bad_resume.skills.additional_skills = ["Docker"] # Cross-list duplicate

    audit = audit_resume_quality(bad_resume)
    assert len(audit.errors) >= 2  # Missing name and missing email
    assert any("email" in e.message.lower() for e in audit.errors)
    assert any("name" in e.message.lower() for e in audit.errors)

    assert len(audit.warnings) >= 2  # Duplicate skills, first-person pronoun, missing phone
    assert any("duplicate" in w.message.lower() for w in audit.warnings)
    assert any("first-person" in w.message.lower() for w in audit.warnings)

    assert audit.overall_score < 70
    assert "Needs Attention" in audit.grade or "Minor" in audit.grade

def test_audit_healthy_resume():
    """Verify well-formed resume receives an A grade and high audit score."""
    healthy = create_base_resume(candidate_name="Jordan Bell")
    audit = audit_resume_quality(healthy)
    assert len(audit.errors) == 0
    assert audit.overall_score >= 85
    assert "A" in audit.grade or "B" in audit.grade

# ============================================================================
# 8. Dual Scoring Re-Check Endpoint Tests
# ============================================================================

def test_recheck_score_dual_assessment_endpoint():
    """Verify /api/recheck-score returns separate Job Match Breakdown AND ATS Quality Assessment."""
    resume = create_base_resume(candidate_name="Morgan Chase")
    jd = """
    We are seeking a Senior Backend Engineer proficient in Python, Go, and PostgreSQL.
    Responsibilities:
    - Build scalable distributed systems and REST APIs.
    - Deploy containerized applications with Docker and Kubernetes on AWS.
    Required Qualifications:
    - 5+ years experience in production software engineering with Python and Go.
    Preferred Qualifications:
    - Experience with Redis and Kafka caching architectures is a plus.
    """

    payload = {
        "resume_data": resume.model_dump(),
        "job_description": jd,
        "previous_score": 80
    }

    res = client.post("/api/recheck-score", json=payload)
    assert res.status_code == 200, f"Re-check failed: {res.text}"
    data = res.json()

    # 1. Job Description Match Score
    assert "match_score" in data
    assert "match_breakdown" in data
    mb = data["match_breakdown"]
    assert mb["required_skill_score"] >= 0
    assert mb["experience_score"] >= 0
    assert mb["factor_weights"]["required_skills"] == 0.35

    # 2. ATS & Resume Quality Assessment
    assert "ats_quality_assessment" in data
    aqa = data["ats_quality_assessment"]
    assert "parseability_score" in aqa
    assert "structure_score" in aqa
    assert "readability_score" in aqa
    assert "formatting_consistency_score" in aqa
    assert "content_coverage_score" in aqa
    assert "completeness_score" in aqa
    assert aqa["factor_weights"]["parseability"] == 0.25

    # 3. Resume Quality Audit
    assert "audit" in data
    audit = data["audit"]
    assert "overall_score" in audit
    assert "errors" in audit
    assert "warnings" in audit
    assert "suggestions" in audit
    assert "metrics" in audit
    assert audit["metrics"]["word_count"] > 50

def test_audit_endpoint_direct():
    """Verify /api/audit endpoint returns deterministic evaluation."""
    resume = create_base_resume(candidate_name="Claire Redfield")
    res = client.post("/api/audit", json=resume.model_dump())
    assert res.status_code == 200
    audit_data = res.json()
    assert "overall_score" in audit_data
    assert "grade" in audit_data
    assert "metrics" in audit_data
    assert audit_data["metrics"]["bullet_count"] >= 2
