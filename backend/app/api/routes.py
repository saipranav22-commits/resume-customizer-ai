from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Response
from app.config import settings
from app.models.schemas import TailoredResumeResponse, HealthResponse, CoverLetterRequest
from app.services.parser import validate_and_extract_resume
from app.services.customizer import customize_resume
from app.services.exporter import export_pdf, export_docx, export_txt, export_cover_letter_pdf

router = APIRouter(prefix="/api", tags=["Resume Customization"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint providing status and LLM configuration info."""
    has_gemini = bool(settings.GEMINI_API_KEY.strip())
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        llm_provider=settings.LLM_PROVIDER,
        llm_configured=has_gemini,
        gemini_key_present=has_gemini
    )

@router.post("/customize", response_model=TailoredResumeResponse)
async def customize_resume_endpoint(
    resume: UploadFile = File(..., description="Uploaded resume file (PDF or DOCX)"),
    job_description: str = Form(..., description="Target Job Description text"),
    customize_summary: bool = Form(True, description="Whether to tailor summary section"),
    customize_skills: bool = Form(True, description="Whether to align skills section"),
    customize_experience: bool = Form(True, description="Whether to rephrase experience bullets")
):
    """
    Main customization endpoint:
    - Validates resume file format and size
    - Validates job description length
    - Parses text from resume
    - Calls LLM customization engine with section customization controls
    - Returns structured tailored resume with diff info and tailored cover letter
    """
    # Validate job description
    cleaned_jd = job_description.strip()
    if not cleaned_jd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty. Please provide the target job requirements."
        )
        
    if len(cleaned_jd) < settings.MIN_JD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job description is too short ({len(cleaned_jd)} characters). Please paste at least {settings.MIN_JD_LENGTH} characters for an accurate analysis."
        )
        
    # Read resume file bytes
    try:
        content = await resume.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read uploaded file: {str(e)}"
        )
        
    # Validate and parse text from PDF or DOCX
    parsed_resume_text, file_size_bytes = validate_and_extract_resume(resume.filename, content)
    
    # Process customization
    tailored_result = await customize_resume(
        parsed_resume_text,
        cleaned_jd,
        customize_summary=customize_summary,
        customize_skills=customize_skills,
        customize_experience=customize_experience
    )
    return tailored_result

@router.post("/export/pdf")
def export_pdf_endpoint(resume_data: TailoredResumeResponse):
    """Export tailored resume as high-fidelity ATS-friendly PDF."""
    try:
        pdf_bytes = export_pdf(resume_data)
        safe_name = "".join(c for c in resume_data.candidate_name if c.isalnum() or c in (' ', '_', '-')).strip() or "Tailored"
        filename = f"{safe_name.replace(' ', '_')}_Resume.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}"
        )

@router.post("/export/docx")
def export_docx_endpoint(resume_data: TailoredResumeResponse):
    """Export tailored resume as Microsoft Word DOCX document."""
    try:
        docx_bytes = export_docx(resume_data)
        safe_name = "".join(c for c in resume_data.candidate_name if c.isalnum() or c in (' ', '_', '-')).strip() or "Tailored"
        filename = f"{safe_name.replace(' ', '_')}_Resume.docx"
        
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Word document: {str(e)}"
        )

@router.post("/export/txt")
def export_txt_endpoint(resume_data: TailoredResumeResponse):
    """Export tailored resume as clean Plain Text format."""
    try:
        txt_str = export_txt(resume_data)
        safe_name = "".join(c for c in resume_data.candidate_name if c.isalnum() or c in (' ', '_', '-')).strip() or "Tailored"
        filename = f"{safe_name.replace(' ', '_')}_Resume.txt"
        
        return Response(
            content=txt_str.encode("utf-8"),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate text file: {str(e)}"
        )

@router.post("/export/cover-letter/pdf")
def export_cover_letter_pdf_endpoint(req: CoverLetterRequest):
    """Export tailored cover letter as styled executive letterhead PDF."""
    try:
        contact_line = " • ".join(filter(None, [
            req.contact_info.email,
            req.contact_info.phone,
            req.contact_info.location,
            req.contact_info.linkedin
        ]))
        pdf_bytes = export_cover_letter_pdf(
            candidate_name=req.candidate_name,
            contact_info_line=contact_line,
            cover_letter_text=req.cover_letter_text,
            target_role=req.target_role or "Target Role"
        )
        safe_name = "".join(c for c in req.candidate_name if c.isalnum() or c in (' ', '_', '-')).strip() or "Tailored"
        filename = f"{safe_name.replace(' ', '_')}_Cover_Letter.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Cover Letter PDF: {str(e)}"
        )

