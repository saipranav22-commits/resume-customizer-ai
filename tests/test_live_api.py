import requests
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"
fixtures_dir = Path(r"E:\ResumeCustomizerAI\backend\tests\fixtures")

def test_live_bonus_features():
    print("=== Testing Live Server & Bonus Features ===")

    # 1. Health check
    health_res = requests.get(f"{BASE_URL}/api/health")
    assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
    print("[PASS] 1. Health check OK")

    # 2. PDF Customization with Section Controls
    pdf_path = fixtures_dir / "sample_resume.pdf"
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
        res = requests.post(f"{BASE_URL}/api/customize", files=files, data=data)
        
    assert res.status_code == 200, f"Customize PDF failed: {res.text}"
    tailored = res.json()
    print("[PASS] 2. PDF Customization with Section Controls OK")
    print(f"   Candidate Name: {tailored['candidate_name']}")
    print(f"   Original Bullets present for Diff: {bool(tailored['experience'][0].get('original_bullets'))}")
    assert tailored.get("generated_cover_letter"), "generated_cover_letter missing from response"
    print(f"[PASS] 3. Cover Letter Generated ({len(tailored['generated_cover_letter'])} chars)")

    # 4. Export Cover Letter as PDF
    cl_payload = {
        "candidate_name": tailored["candidate_name"],
        "contact_info": tailored["contact_info"],
        "target_role": "Senior Full Stack Engineer",
        "company_name": "Engineering Team",
        "cover_letter_text": tailored["generated_cover_letter"]
    }
    cl_pdf_res = requests.post(f"{BASE_URL}/api/export/cover-letter/pdf", json=cl_payload)
    assert cl_pdf_res.status_code == 200, f"Cover Letter PDF export failed: {cl_pdf_res.text}"
    assert cl_pdf_res.content.startswith(b"%PDF"), "Generated Cover Letter PDF does not start with %PDF"
    print(f"[PASS] 4. Cover Letter PDF Exported ({len(cl_pdf_res.content)} bytes)")

    # 5. Export Resume as PDF and Word
    pdf_export = requests.post(f"{BASE_URL}/api/export/pdf", json=tailored)
    assert pdf_export.status_code == 200 and pdf_export.content.startswith(b"%PDF")
    print(f"[PASS] 5. Resume PDF Export OK ({len(pdf_export.content)} bytes)")

    docx_export = requests.post(f"{BASE_URL}/api/export/docx", json=tailored)
    assert docx_export.status_code == 200 and docx_export.content.startswith(b"PK")
    print(f"[PASS] 6. Resume DOCX Export OK ({len(docx_export.content)} bytes)")

    print("\n>>> ALL LIVE BONUS FEATURES VERIFIED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_live_bonus_features()
