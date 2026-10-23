import io
from docx import Document
from pypdf import PdfReader
from app.services.exporter import export_pdf, export_docx, export_txt

def test_export_txt(sample_tailored_resume):
    txt_content = export_txt(sample_tailored_resume)
    assert sample_tailored_resume.candidate_name.upper() in txt_content
    assert "PROFESSIONAL SUMMARY" in txt_content
    assert "CORE QUALIFICATIONS" in txt_content or "TECHNICAL & PROFESSIONAL SKILLS" in txt_content
    assert "Kubernetes" in txt_content
    assert "ADVISORY NOTE" in txt_content

def test_export_pdf(sample_tailored_resume):
    pdf_bytes = export_pdf(sample_tailored_resume)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")
    
    # Verify readable content from generated PDF
    reader = PdfReader(io.BytesIO(pdf_bytes))
    assert len(reader.pages) >= 1
    extracted_text = "".join(page.extract_text() for page in reader.pages)
    assert "Alex Morgan" in extracted_text
    assert "TechCorp Solutions" in extracted_text

def test_export_docx(sample_tailored_resume):
    docx_bytes = export_docx(sample_tailored_resume)
    assert len(docx_bytes) > 500
    assert docx_bytes.startswith(b"PK")  # ZIP magic bytes for docx
    
    # Verify readable paragraphs
    doc = Document(io.BytesIO(docx_bytes))
    full_text = " ".join(p.text for p in doc.paragraphs)
    assert "Alex Morgan" in full_text
    assert "TechCorp Solutions" in full_text
