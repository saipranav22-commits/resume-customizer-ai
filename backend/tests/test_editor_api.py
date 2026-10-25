import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.schemas import (
    TailoredResumeResponse,
    ContactInfo,
    SkillsCategorized,
    ExperienceItem,
    EducationItem,
    ProjectItem,
    AtsCompatibility,
    MatchScoreBreakdown,
)

client = TestClient(app)

SAMPLE_JD = """
Senior Full-Stack Engineer
Requirements:
- 5+ years of experience in Python, FastAPI, and React.
- Strong knowledge of TypeScript, PostgreSQL, and Docker.
- Experience building RESTful APIs and optimizing database performance.
- Familiarity with CI/CD pipelines and AWS cloud services.
Preferred:
- Experience with Next.js, Redis, and Kubernetes.
"""

def make_sample_resume() -> dict:
    return {
        "candidate_name": "Alex Mercer",
        "contact_info": {
            "email": "alex.mercer@example.com",
            "phone": "+1-555-0199",
            "location": "San Francisco, CA",
            "linkedin": "https://linkedin.com/in/alexmercer",
            "github": "https://github.com/alexmercer",
            "portfolio": None,
        },
        "original_summary": "Full stack developer with experience in Python and web development.",
        "tailored_summary": "Experienced Full-Stack Engineer with over 5 years developing scalable services in Python, FastAPI, and React.",
        "skills": {
            "matching_skills": ["Python", "FastAPI", "React", "TypeScript", "PostgreSQL"],
            "additional_skills": ["Docker", "Git", "REST APIs"],
        },
        "experience": [
            {
                "role": "Senior Software Engineer",
                "company": "Apex Cloud Systems",
                "duration": "2021 - Present",
                "location": "San Francisco, CA",
                "bullets": [
                    "Engineered high-throughput REST APIs using FastAPI and PostgreSQL handling 5M requests daily.",
                    "Built responsive frontend interfaces in React and TypeScript with accessible component designs.",
                    "Containerized microservices using Docker and automated CI/CD pipeline deployments.",
                ],
                "original_bullets": [
                    "Worked on REST APIs in FastAPI and PostgreSQL.",
                    "Made frontend pages using React and TypeScript.",
                    "Put apps in Docker and ran deployment pipelines.",
                ],
            }
        ],
        "education": [
            {
                "degree": "B.S. in Computer Science",
                "institution": "University of California, Berkeley",
                "year": "2020",
                "details": "Graduated with Honors",
            }
        ],
        "projects": [
            {
                "name": "Cloud Observability Agent",
                "technologies": ["Python", "Docker", "PostgreSQL"],
                "bullets": [
                    "Designed an asynchronous metrics agent capturing telemetry from distributed nodes."
                ],
                "link": "https://github.com/alexmercer/cloud-agent",
            }
        ],
        "certifications": ["AWS Certified Solutions Architect - Associate"],
        "missing_keywords": [],
        "match_score": 82,
        "ats_compatibility": {
            "score": 88,
            "strengths": ["Strong alignment on core technologies", "Clear technical metrics"],
            "improvements": ["Add Kubernetes or Redis if evidenced"],
        },
        "raw_parsed_resume_text": "Alex Mercer - Senior Software Engineer...",
        "job_description_summary": "Senior Full-Stack Engineer role requiring Python, FastAPI, React.",
        "is_llm_generated": False,
        "customization_engine": "deterministic_fallback",
    }


def test_improve_text_endpoint_success():
    payload = {
        "text": "Responsible for managing the API gateway and handled database queries.",
        "section_type": "experience",
        "job_description": SAMPLE_JD,
        "context": "Senior Software Engineer at Apex Cloud Systems",
    }
    response = client.post("/api/improve-text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "improved_text" in data
    assert "rationale" in data
    assert data["original_text"] == payload["text"]
    # Check that weak verbs were upgraded
    assert "Responsible for" not in data["improved_text"]
    assert len(data["improved_text"]) > 10


def test_improve_text_endpoint_validation():
    # Empty text
    res = client.post("/api/improve-text", json={"text": "", "job_description": SAMPLE_JD})
    assert res.status_code == 422 or res.status_code == 400

    # Empty JD
    res = client.post(
        "/api/improve-text",
        json={"text": "Built scalable distributed database pipelines.", "job_description": ""},
    )
    assert res.status_code == 422 or res.status_code == 400


def test_recheck_score_endpoint_success():
    resume_payload = make_sample_resume()
    payload = {
        "resume_data": resume_payload,
        "job_description": SAMPLE_JD,
        "previous_score": 75,
        "previous_breakdown": {
            "overall_score": 75,
            "required_skill_score": 70,
            "preferred_skill_score": 60,
            "experience_score": 75,
            "responsibility_score": 75,
            "keyword_score": 70,
            "structure_score": 90,
            "factor_weights": {
                "required_skills": 0.35,
                "preferred_skills": 0.15,
                "experience": 0.20,
                "responsibilities": 0.15,
                "keyword_coverage": 0.10,
                "structure": 0.05,
            },
            "explanation": "Initial baseline breakdown",
            "disclaimer": "Match score disclaimer",
        },
    }
    response = client.post("/api/recheck-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "match_score" in data
    assert "match_breakdown" in data
    assert "recommendations" in data
    assert "score_delta" in data
    assert "factor_deltas" in data
    assert isinstance(data["score_delta"], int)
    assert data["match_score"] >= 20 and data["match_score"] <= 100
    assert "required_skills" in data["factor_deltas"]


def test_recheck_score_sensitivity_adding_skills():
    resume_payload = make_sample_resume()
    # Baseline check
    res1 = client.post(
        "/api/recheck-score",
        json={"resume_data": resume_payload, "job_description": SAMPLE_JD},
    )
    assert res1.status_code == 200
    score1 = res1.json()["match_score"]

    # Now add missing preferred skills (Kubernetes, Redis, AWS)
    resume_payload["skills"]["matching_skills"].extend(["Kubernetes", "Redis", "AWS"])
    resume_payload["experience"][0]["bullets"].append(
        "Deployed Redis caching layer and orchestrated microservices with Kubernetes on AWS."
    )

    res2 = client.post(
        "/api/recheck-score",
        json={
            "resume_data": resume_payload,
            "job_description": SAMPLE_JD,
            "previous_score": score1,
        },
    )
    assert res2.status_code == 200
    score2 = res2.json()["match_score"]
    delta = res2.json()["score_delta"]

    # Score should improve or stay high
    assert score2 >= score1
    assert delta == score2 - score1
