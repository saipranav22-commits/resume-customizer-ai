import io
import pytest
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas

from app.main import app

client = TestClient(app)

def create_dummy_pdf() -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(100, 750, "Jordan Lee")
    c.drawString(100, 730, "jordan@example.com")
    c.drawString(100, 710, "Software Developer with experience in Python, FastAPI, and React.")
    c.drawString(100, 690, "Experience: Full Stack Developer at Acme Corp. Built REST services.")
    c.save()
    buf.seek(0)
    return buf.getvalue()

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "llm_provider" in data

def test_customize_missing_jd():
    pdf_bytes = create_dummy_pdf()
    files = {"resume": ("resume.pdf", pdf_bytes, "application/pdf")}
    data = {"job_description": "   "}
    response = client.post("/api/customize", files=files, data=data)
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]

def test_customize_short_jd():
    pdf_bytes = create_dummy_pdf()
    files = {"resume": ("resume.pdf", pdf_bytes, "application/pdf")}
    data = {"job_description": "Too short"}
    response = client.post("/api/customize", files=files, data=data)
    assert response.status_code == 400
    assert "too short" in response.json()["detail"]

def test_customize_unsupported_file():
    files = {"resume": ("resume.exe", b"binarycontent", "application/octet-stream")}
    data = {"job_description": "We are seeking a senior full stack software engineer proficient in modern web applications."}
    response = client.post("/api/customize", files=files, data=data)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

def test_customize_success_with_pdf():
    pdf_bytes = create_dummy_pdf()
    files = {"resume": ("resume.pdf", pdf_bytes, "application/pdf")}
    jd = "We are seeking a talented Software Developer who knows Python, FastAPI, React, and Cloud infrastructure."
    response = client.post("/api/customize", files=files, data={"job_description": jd})
    assert response.status_code == 200
    res_data = response.json()
    assert "candidate_name" in res_data
    assert "tailored_summary" in res_data
    assert "skills" in res_data
    assert "experience" in res_data
    assert "missing_keywords" in res_data
    assert "match_score" in res_data
    assert res_data["match_score"] >= 0

def test_export_pdf_endpoint(sample_tailored_resume):
    response = client.post("/api/export/pdf", json=sample_tailored_resume.model_dump())
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment;" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF")

def test_export_docx_endpoint(sample_tailored_resume):
    response = client.post("/api/export/docx", json=sample_tailored_resume.model_dump())
    assert response.status_code == 200
    assert "wordprocessingml.document" in response.headers["content-type"]
    assert "attachment;" in response.headers["content-disposition"]
    assert response.content.startswith(b"PK")

def test_export_txt_endpoint(sample_tailored_resume):
    response = client.post("/api/export/txt", json=sample_tailored_resume.model_dump())
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    assert "ALEX MORGAN" in response.text

def test_export_cover_letter_pdf_endpoint():
    payload = {
        "candidate_name": "Taylor Swift",
        "contact_info": {
            "email": "taylor@example.com",
            "phone": "+1 555-1234",
            "location": "Nashville, TN"
        },
        "target_role": "Lead Software Architect",
        "company_name": "Acme Innovations",
        "cover_letter_text": "Dear Hiring Team,\n\nI am thrilled to submit my application for the Lead Software Architect position. With extensive experience in cloud-native platforms, I look forward to contributing.\n\nSincerely,\nTaylor Swift"
    }
    response = client.post("/api/export/cover-letter/pdf", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment;" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF")

def test_customize_with_section_controls():
    pdf_bytes = create_dummy_pdf()
    files = {"resume": ("resume.pdf", pdf_bytes, "application/pdf")}
    data = {
        "job_description": "We are seeking a senior full-stack developer with experience in Python and React.",
        "customize_summary": "false",
        "customize_skills": "true",
        "customize_experience": "false"
    }
    response = client.post("/api/customize", files=files, data=data)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["generated_cover_letter"]
    assert len(res_data["generated_cover_letter"]) > 100
    assert "experience" in res_data
    assert len(res_data["experience"][0]["original_bullets"]) > 0

