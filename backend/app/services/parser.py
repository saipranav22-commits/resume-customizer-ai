import io
import re
from pathlib import Path
from typing import Tuple
from fastapi import HTTPException, status
from pypdf import PdfReader
from docx import Document

from app.config import settings

def parse_pdf_bytes(data: bytes) -> str:
    """Extract clean text content from PDF file bytes."""
    try:
        reader = PdfReader(io.BytesIO(data))
        if len(reader.pages) == 0:
            raise ValueError("The uploaded PDF file contains no pages.")
        
        extracted_text_list = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_text_list.append(page_text.strip())
        
        full_text = "\n\n".join(extracted_text_list)
        if not full_text.strip():
            raise ValueError("No readable text could be extracted from this PDF. It may be a scanned image or password-protected.")
        
        return full_text
    except Exception as e:
        if isinstance(e, ValueError):
            raise
        raise ValueError(f"Failed to parse PDF document: {str(e)}")

def parse_docx_bytes(data: bytes) -> str:
    """Extract clean text content from DOCX file bytes including tables."""
    try:
        doc = Document(io.BytesIO(data))
        text_parts = []
        
        # Read paragraphs
        for p in doc.paragraphs:
            stripped = p.text.strip()
            if stripped:
                text_parts.append(stripped)
                
        # Read tables (often used for skills, dates, and contact info)
        for table in doc.tables:
            for row in table.rows:
                row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_cells:
                    text_parts.append(" | ".join(row_cells))
                    
        full_text = "\n".join(text_parts)
        if not full_text.strip():
            raise ValueError("The uploaded DOCX file is empty or contains no readable text.")
            
        return full_text
    except Exception as e:
        if isinstance(e, ValueError):
            raise
        raise ValueError(f"Failed to parse DOCX document: {str(e)}")

def clean_extracted_text(text: str) -> str:
    """Normalize whitespace and linebreaks while preserving markdown/section semantics."""
    # Replace null bytes
    text = text.replace("\x00", "")
    # Normalize carriage returns and CRLF to standard newline
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse 3 or more consecutive newlines into 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Replace non-breaking spaces
    text = text.replace('\xa0', ' ')
    return text.strip()

def validate_and_extract_resume(filename: str, content: bytes) -> Tuple[str, int]:
    """
    Validates file extension, size, and extracts clean text.
    Returns (extracted_text, file_size_in_bytes).
    """
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing."
        )
        
    ext = Path(filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Only PDF (.pdf) and Word (.docx) files are supported."
        )
        
    size_bytes = len(content)
    if size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )
        
    if size_bytes > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File size ({size_bytes / (1024*1024):.1f} MB) exceeds the maximum allowed limit of {settings.MAX_FILE_SIZE_MB} MB."
        )
        
    try:
        if ext == ".pdf":
            raw_text = parse_pdf_bytes(content)
        elif ext == ".docx":
            raw_text = parse_docx_bytes(content)
        else:
            raise ValueError("Unsupported format.")
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
        
    cleaned_text = clean_extracted_text(raw_text)
    if len(cleaned_text) < 30:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Extracted text is too short to be a valid resume."
        )
        
    return cleaned_text, size_bytes
