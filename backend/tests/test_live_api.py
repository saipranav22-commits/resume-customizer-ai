import os
import requests
import pytest
from pathlib import Path

# Production API base URL
PROD_BASE_URL = os.getenv("PRODUCTION_API_URL", os.getenv("TEST_BASE_URL", "https://resume-customizer-ai.onrender.com"))
LOCAL_BASE_URL = os.getenv("LOCAL_API_URL", "http://127.0.0.1:8000")

# Portable fixture resolution relative to this test file
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

def test_mandatory_production_integration():
    """
    Mandatory Production Integration Test.
    Must fail (never skip) if the deployed production API is unreachable or returns an error.
    Must verify genuine Gemini generation rather than silent fallback output.
    """
    print(f"\n=== Running Mandatory Production Integration Verification against {PROD_BASE_URL} ===")

    # 1. Mandatory health check - fails if unreachable
    try:
        health_res = requests.get(f"{PROD_BASE_URL}/api/health", timeout=45.0)
    except requests.exceptions.RequestException as e:
        pytest.fail(f"Mandatory production API is unreachable at {PROD_BASE_URL}: {str(e)}")

    assert health_res.status_code == 200, (
        f"Production health check failed with status {health_res.status_code}: {health_res.text}"
    )
    health_json = health_res.json()
    assert health_json.get("status") == "healthy", f"Unexpected health status: {health_json}"
    print("[PASS] 1. Production API health check HTTP 200 OK")

    # 2. Portable fixture loading
    pdf_path = FIXTURES_DIR / "sample_resume.pdf"
    assert pdf_path.exists(), f"Sample PDF fixture missing at portable path: {pdf_path}"

    jd = """
    Role: Senior Full Stack Engineer (Python & Next.js)
    Requirements:
    - 3+ years experience with Next.js, React, and TypeScript
    - Strong proficiency in Python, FastAPI, and PostgreSQL
    - Hands-on experience with Docker, Kubernetes, and Cloud Deployments
    """

    with open(pdf_path, "rb") as f:
        files = {"resume": ("sample_resume.pdf", f, "application/pdf")}
        data = {
            "job_description": jd,
            "customize_summary": "true",
            "customize_skills": "true",
            "customize_experience": "true"
        }
        res = requests.post(f"{PROD_BASE_URL}/api/customize", files=files, data=data, timeout=90.0)

    assert res.status_code == 200, f"Mandatory production customization failed: {res.text}"
    tailored = res.json()
    print("[PASS] 2. Production customization endpoint returned HTTP 200 OK")

    # 3. Authenticity check: strictly verify real Gemini generation vs. fallback
    assert tailored.get("is_llm_generated") is True, (
        f"Authenticity failure: Expected genuine Gemini generation, but received fallback output! "
        f"is_llm_generated={tailored.get('is_llm_generated')}, engine={tailored.get('customization_engine')}"
    )
    assert tailored.get("customization_engine") == "gemini", (
        f"Authenticity failure: Expected engine 'gemini', but got '{tailored.get('customization_engine')}'"
    )
    print(f"[PASS] 3. Gemini authenticity confirmed (engine: {tailored.get('customization_engine')})")

    # 4. Content integrity
    assert tailored.get("candidate_name"), "Candidate name is missing"
    assert len(tailored.get("experience", [])) > 0, "No experience items found"
    assert tailored["experience"][0].get("original_bullets") is not None, "Original bullets missing for diff view"
    assert tailored.get("generated_cover_letter"), "Generated cover letter is missing"
    print(f"[PASS] 4. Tailored content verified (Cover letter: {len(tailored['generated_cover_letter'])} chars)")

    # 5. Export actions on live production
    pdf_export = requests.post(f"{PROD_BASE_URL}/api/export/pdf", json=tailored, timeout=30.0)
    assert pdf_export.status_code == 200 and pdf_export.content.startswith(b"%PDF"), "PDF export failed"

    docx_export = requests.post(f"{PROD_BASE_URL}/api/export/docx", json=tailored, timeout=30.0)
    assert docx_export.status_code == 200 and docx_export.content.startswith(b"PK"), "DOCX export failed"
    print(f"[PASS] 5. Live export endpoints verified (PDF: {len(pdf_export.content)} bytes, DOCX: {len(docx_export.content)} bytes)")

@pytest.mark.optional
def test_optional_local_dev_server():
    """
    Optional test for local development server.
    Skips cleanly if the developer does not have a local uvicorn instance running on port 8000.
    """
    try:
        res = requests.get(f"{LOCAL_BASE_URL}/api/health", timeout=1.5)
        if res.status_code != 200:
            pytest.skip(f"Local dev server at {LOCAL_BASE_URL} returned status {res.status_code}")
    except requests.exceptions.RequestException:
        pytest.skip(f"Optional test skipped: No local development server running on {LOCAL_BASE_URL}")

    # If running, verify local health
    assert res.status_code == 200
    print(f"[PASS] Optional local development server is running and healthy at {LOCAL_BASE_URL}")

if __name__ == "__main__":
    test_mandatory_production_integration()
