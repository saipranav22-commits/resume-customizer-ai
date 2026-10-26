import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.name_normalizer import (
    normalize_candidate_name,
    extract_authoritative_name,
    reconcile_candidate_name,
)
from app.services.parser import clean_extracted_text
from app.services.exporter import export_txt, export_docx, export_pdf
from app.models.schemas import (
    TailoredResumeResponse,
    ContactInfo,
    ExperienceItem,
    EducationItem,
    ProjectItem,
    SkillsCategorized,
    AtsCompatibility,
)

client = TestClient(app)

SAMPLE_RESUME = TailoredResumeResponse(
    candidate_name="B SAI PRANAV",
    contact_info=ContactInfo(
        email="saipranav@example.com",
        phone="+91 9876543210",
        location="Hyderabad, India",
        linkedin="linkedin.com/in/bsaipranav",
        github="github.com/bsaipranav",
    ),
    original_summary="Experienced Full Stack Software Engineer.",
    tailored_summary="Experienced Full Stack Software Engineer specializing in distributed backend systems and high-throughput microservices.",
    skills=SkillsCategorized(
        matching_skills=["Python", "FastAPI", "React", "PostgreSQL"],
        additional_skills=["Docker", "AWS", "Git"],
    ),
    experience=[
        ExperienceItem(
            role="Senior Software Engineer",
            company="Tech Corp",
            duration="2022 - Present",
            location="Remote",
            bullets=[
                "Architected distributed data ingestion pipelines processing 5M+ daily events.",
                "Optimized SQL queries reducing 95th percentile database latency by 45%.",
            ],
            original_bullets=[
                "Built data pipelines.",
                "Optimized SQL queries.",
            ],
        )
    ],
    education=[
        EducationItem(
            degree="Bachelor of Technology in Computer Science",
            institution="Premier Institute of Technology",
            year="2022",
            details="First Class with Distinction",
        )
    ],
    projects=[
        ProjectItem(
            name="Resume Customizer AI",
            technologies=["Next.js", "FastAPI", "PostgreSQL", "Tailwind CSS"],
            bullets=[
                "Designed real-time ATS optimization scoring engine with sub-200ms latency.",
                "Implemented secure multi-tenant resume version history with zero cascade data loss.",
            ],
            link="https://github.com/saipranav/resume-customizer",
        )
    ],
    certifications=["AWS Certified Solutions Architect", "CKA"],
    match_score=92,
    ats_compatibility=AtsCompatibility(
        score=90,
        strengths=["Strong core alignment", "Clear technical metrics"],
        improvements=["Consider adding Kubernetes"],
    ),
)

SAMPLE_JD = """
We are looking for a Senior Software Engineer with strong experience in Python, FastAPI, React,
and PostgreSQL. The ideal candidate will design high-throughput microservices, optimize distributed
databases, and build resilient web applications with continuous integration and deployment.
"""


# =====================================================================
# 1. Candidate Name Integrity Normalizer Tests
# =====================================================================

def test_b_sai_pranav_exact_preservation():
    """Verify B SAI PRANAV is preserved accurately with initial and spacing."""
    assert normalize_candidate_name("B SAI PRANAV") == "B SAI PRANAV"
    assert normalize_candidate_name("  B   SAI   PRANAV  ") == "B SAI PRANAV"


def test_heal_kerning_split_prana_v():
    """Verify kerning-induced detached single letter 'PRANA V' is healed to 'PRANAV'."""
    assert normalize_candidate_name("B SAI PRANA V") == "B SAI PRANAV"
    assert normalize_candidate_name("SAI PRANA V") == "SAI PRANAV"
    assert normalize_candidate_name("PRANA V") == "PRANAV"


def test_initials_preservation():
    """Verify initials with or without periods are preserved."""
    assert normalize_candidate_name("J. R. R. Tolkien") == "J. R. R. Tolkien"
    assert normalize_candidate_name("A. P. J. Abdul Kalam") == "A. P. J. Abdul Kalam"
    assert normalize_candidate_name("C S Lewis") == "C S Lewis"
    assert normalize_candidate_name("George R. R. Martin") == "George R. R. Martin"


def test_multi_word_surnames():
    """Verify multi-word surnames are preserved without improper merging."""
    assert normalize_candidate_name("Ludwig van Beethoven") == "Ludwig van Beethoven"
    assert normalize_candidate_name("Gabriel García Márquez") == "Gabriel García Márquez"
    assert normalize_candidate_name("Vincent van Gogh") == "Vincent van Gogh"
    assert normalize_candidate_name("Leonardo da Vinci") == "Leonardo da Vinci"


def test_hyphenated_names():
    """Verify hyphenated first names and surnames are preserved."""
    assert normalize_candidate_name("Jean-Luc Picard") == "Jean-Luc Picard"
    assert normalize_candidate_name("Mary-Jane Watson") == "Mary-Jane Watson"
    assert normalize_candidate_name("Anne-Marie Slaughter") == "Anne-Marie Slaughter"


def test_apostrophe_names():
    """Verify names with apostrophes (including smart quotes) are normalized."""
    assert normalize_candidate_name("Shaquille O'Neal") == "Shaquille O'Neal"
    assert normalize_candidate_name("Conan O’Brien") == "Conan O'Brien"
    assert normalize_candidate_name("d'Angelo Russell") == "d'Angelo Russell"


def test_unicode_and_diacritics():
    """Verify accented and diacritic characters are preserved in NFC form."""
    assert normalize_candidate_name("Renée Dupont") == "Renée Dupont"
    assert normalize_candidate_name("José Müller") == "José Müller"
    assert normalize_candidate_name("Søren Kierkegaard") == "Søren Kierkegaard"
    assert normalize_candidate_name("François Truffaut") == "François Truffaut"


# =====================================================================
# 2. Parser Authoritative Name Extraction & Text Cleanup
# =====================================================================

def test_extract_authoritative_name_from_raw_text():
    raw_resume = """
    B SAI PRANAV
    saipranav@example.com | +91 9876543210 | Hyderabad, India
    linkedin.com/in/bsaipranav

    PROFESSIONAL SUMMARY
    Senior Software Engineer with 5+ years experience...
    """
    auth_name = extract_authoritative_name(raw_resume)
    assert auth_name == "B SAI PRANAV"


def test_clean_extracted_text_heals_kerning():
    raw_text = "B SAI PRANA V\nSenior Backend Engineer\nEmail: test@test.com"
    cleaned = clean_extracted_text(raw_text)
    assert "B SAI PRANAV" in cleaned
    assert "PRANA V" not in cleaned


# =====================================================================
# 3. AI Identity Reconciliation Tests
# =====================================================================

def test_reconcile_candidate_name_prevents_ai_corruption():
    source_resume = "B SAI PRANAV\nsaipranav@example.com\nSenior Backend Engineer"
    
    # Case 1: AI outputs corrupted kerning name
    reconciled = reconcile_candidate_name("B SAI PRANA V", source_resume)
    assert reconciled == "B SAI PRANAV"

    # Case 2: AI outputs completely wrong hallucinated name
    reconciled_hallucination = reconcile_candidate_name("John Doe", source_resume)
    assert reconciled_hallucination == "B SAI PRANAV"

    # Case 3: AI outputs exact name
    reconciled_exact = reconcile_candidate_name("B SAI PRANAV", source_resume)
    assert reconciled_exact == "B SAI PRANAV"


# =====================================================================
# 4. Export Name Fidelity Tests
# =====================================================================

def test_txt_export_name_fidelity():
    txt_content = export_txt(SAMPLE_RESUME)
    assert "B SAI PRANAV" in txt_content
    assert "B SAI PRANA V" not in txt_content


def test_docx_export_name_fidelity():
    import io
    import zipfile
    docx_bytes = export_docx(SAMPLE_RESUME)
    assert len(docx_bytes) > 0
    with zipfile.ZipFile(io.BytesIO(docx_bytes)) as z:
        doc_xml = z.read("word/document.xml").decode("utf-8")
    assert "B SAI PRANAV" in doc_xml


def test_pdf_export_name_fidelity():
    import io
    import pypdf
    pdf_bytes = export_pdf(SAMPLE_RESUME)
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    pdf_text = "".join(page.extract_text() or "" for page in reader.pages)
    assert "B SAI PRANAV" in pdf_text


# =====================================================================
# 5. Batch AI Improvement API Endpoint Tests
# =====================================================================

def test_batch_improve_all_sections():
    payload = {
        "scope": "all",
        "job_description": SAMPLE_JD,
        "resume_data": SAMPLE_RESUME.model_dump(),
    }
    response = client.post("/api/editor/batch-improve", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["scope"] == "all"
    assert data["total_items"] > 0
    assert len(data["improvements"]) > 0

    first = data["improvements"][0]
    assert "id" in first
    assert "section_type" in first
    assert "location" in first
    assert "original_text" in first
    assert "improved_text" in first
    assert "rationale" in first
    assert "impact_keywords" in first


def test_batch_improve_summary_scope():
    payload = {
        "scope": "summary",
        "job_description": SAMPLE_JD,
        "resume_data": SAMPLE_RESUME.model_dump(),
    }
    response = client.post("/api/editor/batch-improve", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["scope"] == "summary"
    assert data["total_items"] == 1
    assert data["improvements"][0]["id"] == "summary"
    assert data["improvements"][0]["section_type"] == "summary"


def test_batch_improve_experience_scope():
    payload = {
        "scope": "experience",
        "job_description": SAMPLE_JD,
        "resume_data": SAMPLE_RESUME.model_dump(),
    }
    response = client.post("/api/editor/batch-improve", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["scope"] == "experience"
    for item in data["improvements"]:
        assert item["section_type"] == "experience"
        assert item["id"].startswith("exp-")


def test_batch_improve_validation_errors():
    # Missing job description
    payload = {
        "scope": "all",
        "job_description": "",
        "resume_data": SAMPLE_RESUME.model_dump(),
    }
    response = client.post("/api/editor/batch-improve", json=payload)
    assert response.status_code in (400, 422)
