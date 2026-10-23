from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.services.parser import parse_pdf_bytes, parse_docx_bytes

client = TestClient(app)
fixtures_dir = Path(__file__).resolve().parent / "fixtures"

def test_real_pdf_fixture_parsing():
    pdf_path = fixtures_dir / "sample_resume.pdf"
    assert pdf_path.exists(), "Sample PDF fixture missing"
    
    with open(pdf_path, "rb") as f:
        content = f.read()
    
    text = parse_pdf_bytes(content)
    assert len(text) > 100, f"Expected substantial text from real PDF, got {len(text)} chars"

def test_real_docx_fixture_parsing():
    docx_path = fixtures_dir / "sample_resume.docx"
    assert docx_path.exists(), "Sample DOCX fixture missing"
    
    with open(docx_path, "rb") as f:
        content = f.read()
        
    text = parse_docx_bytes(content)
    assert len(text) > 100, f"Expected substantial text from real DOCX, got {len(text)} chars"

def test_real_pdf_customization_endpoint():
    pdf_path = fixtures_dir / "sample_resume.pdf"
    with open(pdf_path, "rb") as f:
        content = f.read()
        
    jd = "Seeking a Full Stack Developer with strong problem solving skills, Python, React, and REST API experience."
    response = client.post(
        "/api/customize",
        files={"resume": ("sample_resume.pdf", content, "application/pdf")},
        data={"job_description": jd}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_name"]
    assert len(data["skills"]["matching_skills"]) > 0 or len(data["skills"]["additional_skills"]) > 0

def test_real_docx_customization_endpoint():
    docx_path = fixtures_dir / "sample_resume.docx"
    with open(docx_path, "rb") as f:
        content = f.read()
        
    jd = "Seeking a Full Stack Developer with strong problem solving skills, Python, React, and REST API experience."
    response = client.post(
        "/api/customize",
        files={"resume": ("sample_resume.docx", content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"job_description": jd}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["candidate_name"]
    assert len(data["skills"]["matching_skills"]) > 0 or len(data["skills"]["additional_skills"]) > 0
