import io
import pytest
from fastapi import HTTPException
from reportlab.pdfgen import canvas
from docx import Document

from app.services.parser import (
    parse_pdf_bytes,
    parse_docx_bytes,
    validate_and_extract_resume,
    clean_extracted_text
)

def create_in_memory_pdf(text: str) -> bytes:
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer)
    y = 800
    for line in text.split("\n"):
        p.drawString(100, y, line)
        y -= 20
    p.save()
    buffer.seek(0)
    return buffer.getvalue()

def create_in_memory_docx(paragraphs: list[str]) -> bytes:
    doc = Document()
    for text in paragraphs:
        doc.add_paragraph(text)
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()

def test_parse_valid_pdf():
    pdf_text = "Jane Doe\njane@example.com\nSoftware Engineer with experience in Python and React."
    pdf_bytes = create_in_memory_pdf(pdf_text)
    
    parsed = parse_pdf_bytes(pdf_bytes)
    assert "Jane Doe" in parsed
    assert "Software Engineer" in parsed

def test_parse_valid_docx():
    docx_paras = ["John Smith", "john.smith@example.com", "Full Stack Developer specializing in FastAPI."]
    docx_bytes = create_in_memory_docx(docx_paras)
    
    parsed = parse_docx_bytes(docx_bytes)
    assert "John Smith" in parsed
    assert "FastAPI" in parsed

def test_validate_and_extract_unsupported_format():
    with pytest.raises(HTTPException) as exc_info:
        validate_and_extract_resume("resume.txt", b"Some plain text resume")
    assert exc_info.value.status_code == 400
    assert "Unsupported file format" in exc_info.value.detail

def test_validate_and_extract_empty_file():
    with pytest.raises(HTTPException) as exc_info:
        validate_and_extract_resume("resume.pdf", b"")
    assert exc_info.value.status_code == 400
    assert "empty" in exc_info.value.detail

def test_validate_and_extract_oversized_file():
    huge_bytes = b"0" * (6 * 1024 * 1024)  # 6 MB
    with pytest.raises(HTTPException) as exc_info:
        validate_and_extract_resume("huge.pdf", huge_bytes)
    assert exc_info.value.status_code == 413
    assert "exceeds" in exc_info.value.detail

def test_clean_extracted_text():
    raw = "Line 1\x00\r\n\r\n\r\n\r\nLine 2\xa0with non-breaking space"
    cleaned = clean_extracted_text(raw)
    assert "\x00" not in cleaned
    assert "\r" not in cleaned
    assert "Line 1\n\nLine 2 with non-breaking space" in cleaned
