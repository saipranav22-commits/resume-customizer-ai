from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Response, Depends, Header, Query
from typing import List, Optional
import re
from app.config import settings
from app.models.schemas import (
    TailoredResumeResponse,
    HealthResponse,
    CoverLetterRequest,
    UserProfile,
    CustomizationHistoryItem,
    CustomizationHistoryDetail,
    SaveHistoryRequest,
    ForkVersionRequest,
    UpdateVersionMetadataRequest,
    CompareVersionsRequest,
    VersionComparisonResponse,
)
from app.services.auth import (
    AuthenticatedUser,
    get_current_user,
    get_current_user_optional,
    extract_bearer_token
)
from app.services.history_service import history_service
from app.services.parser import validate_and_extract_resume
from app.services.customizer import customize_resume
from app.services.exporter import export_pdf, export_docx, export_txt, export_cover_letter_pdf

router = APIRouter(prefix="/api", tags=["Resume Customization"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint providing minimal service information in production."""
    if settings.ENVIRONMENT.lower() == "production":
        return HealthResponse(
            status="healthy",
            version=settings.VERSION
        )
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
    customize_experience: bool = Form(True, description="Whether to rephrase experience bullets"),
    current_user: Optional[AuthenticatedUser] = Depends(get_current_user_optional)
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



# --- Phase 5A: Authenticated Profile & History Endpoints ---

@router.get('/auth/me', response_model=UserProfile, tags=['Authentication'])
async def get_current_user_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Return authenticated user profile extracted from verified Supabase JWT."""
    meta = current_user.user_metadata or {}
    full_name = meta.get('full_name') or meta.get('name') or ''
    avatar_url = meta.get('avatar_url') or ''
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=full_name,
        avatar_url=avatar_url
    )

@router.get('/history', response_model=List[CustomizationHistoryItem], tags=['Resume History'])
async def list_resume_history(
    resume_id: Optional[str] = Query(None, description="Filter versions by base resume ID"),
    root_id: Optional[str] = Query(None, description="Filter versions by revision tree root ID"),
    is_starred: Optional[bool] = Query(None, description="Filter versions by favorite/starred status"),
    tag: Optional[str] = Query(None, description="Filter versions by tag"),
    search: Optional[str] = Query(None, description="Search keyword in title or version name"),
    limit: int = Query(50, ge=1, le=100, description="Page size limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """List customization history records and resume versions owned by authenticated user."""
    token = extract_bearer_token(authorization)
    return await history_service.list_history(
        user_id=current_user.id,
        user_token=token,
        resume_id=resume_id,
        root_id=root_id,
        is_starred=is_starred,
        tag=tag,
        search=search,
        limit=limit,
        offset=offset
    )

@router.post('/history', response_model=CustomizationHistoryItem, status_code=status.HTTP_201_CREATED, tags=['Resume History'])
async def save_resume_history(
    req: SaveHistoryRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """Save a tailored resume customization result or new version to the user history."""
    token = extract_bearer_token(authorization)
    return await history_service.save_history(current_user.id, req, token)

@router.post('/history/compare', response_model=VersionComparisonResponse, tags=['Resume History'])
async def compare_resume_versions(
    req: CompareVersionsRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """Compare two saved resume versions deterministically, reporting score deltas, added/removed skills, and bullet changes."""
    token = extract_bearer_token(authorization)
    return await history_service.compare_versions(
        user_id=current_user.id,
        version_a_id=req.version_a_id,
        version_b_id=req.version_b_id,
        user_token=token
    )

@router.get('/history/{history_id}', response_model=CustomizationHistoryDetail, tags=['Resume History'])
async def get_resume_history_detail(
    history_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """Get detail of a specific saved resume customization version. Enforces strict user ownership."""
    token = extract_bearer_token(authorization)
    item = await history_service.get_history_detail(current_user.id, history_id, token)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Customization history item not found or you are not authorized to access it'
        )
    return item

@router.patch('/history/{history_id}', response_model=CustomizationHistoryItem, tags=['Resume History'])
@router.patch('/history/{history_id}/metadata', response_model=CustomizationHistoryItem, tags=['Resume History'])
async def update_version_metadata(
    history_id: str,
    req: UpdateVersionMetadataRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """Update mutable metadata (title, version_name, notes, tags, starred status) of a version snapshot."""
    token = extract_bearer_token(authorization)
    updated = await history_service.update_version_metadata(current_user.id, history_id, req, token)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Customization history item not found or you are not authorized to update it'
        )
    return updated

@router.post('/history/{history_id}/fork', response_model=CustomizationHistoryItem, status_code=status.HTTP_201_CREATED, tags=['Resume History'])
async def fork_resume_version(
    history_id: str,
    req: ForkVersionRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """Fork an existing resume version into a new child revision in the same revision family."""
    token = extract_bearer_token(authorization)
    return await history_service.fork_version(current_user.id, history_id, req, token)

@router.delete('/history/{history_id}', tags=['Resume History'])
async def delete_resume_history(
    history_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """Delete a saved resume customization record without cascade data loss. Enforces strict user ownership."""
    token = extract_bearer_token(authorization)
    success = await history_service.delete_history(current_user.id, history_id, token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Customization history item not found or you are not authorized to delete it'
        )
    return {'message': 'Customization history item deleted successfully'}

@router.get('/history/{history_id}/export/{format}', tags=['Resume History'])
async def export_version_document(
    history_id: str,
    format: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """Export a saved resume version directly as PDF, DOCX, or TXT."""
    fmt = format.lower().strip()
    if fmt not in ('pdf', 'docx', 'txt'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export format '{format}'. Supported formats are: pdf, docx, txt"
        )

    token = extract_bearer_token(authorization)
    item = await history_service.get_history_detail(current_user.id, history_id, token)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Customization history item not found or you are not authorized to export it'
        )

    resume = item.tailored_result
    safe_name = re.sub(r'[^a-zA-Z0-9_\- ]', '', resume.candidate_name).strip() or "Customized"
    safe_name = safe_name.replace(' ', '_')
    v_tag = f"_v{item.version_number}" if item.version_number else ""

    if fmt == 'pdf':
        content = export_pdf(resume)
        media_type = "application/pdf"
        filename = f"{safe_name}{v_tag}_Resume.pdf"
    elif fmt == 'docx':
        content = export_docx(resume)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"{safe_name}{v_tag}_Resume.docx"
    else:  # txt
        txt_str = export_txt(resume)
        content = txt_str.encode('utf-8')
        media_type = "text/plain; charset=utf-8"
        filename = f"{safe_name}{v_tag}_Resume.txt"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
