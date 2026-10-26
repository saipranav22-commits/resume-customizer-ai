import io
import re
from typing import Optional, List
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models.schemas import TailoredResumeResponse
from app.services.name_normalizer import (
    normalize_candidate_name,
    format_cover_letter_with_verified_signature,
)

# Palette for PDF
COLOR_PRIMARY = HexColor("#1E293B")     # Slate 800 - Deep charcoal
COLOR_SECONDARY = HexColor("#1E40AF")   # Blue 800 - Professional conservative navy
COLOR_TEXT = HexColor("#334155")        # Slate 700 - High contrast body text
COLOR_MUTED = HexColor("#475569")       # Slate 600 - Readable contact info
COLOR_LINE = HexColor("#CBD5E1")        # Slate 300 - Clean dividing rule

def clean_pdf_text(text: Optional[str]) -> str:
    """
    Sanitize text for ReportLab Paragraph XML parser:
    - Strips unprintable control characters.
    - Normalizes unicode typography (curly quotes, dashes, non-breaking spaces).
    - Escapes XML special characters (&, <, >) while preserving legitimate formatting tags.
    """
    if not text:
        return ""
    # Strip non-printable control chars except tab/newline
    cleaned = "".join(c for c in str(text) if ord(c) >= 32 or c in ("\n", "\r", "\t"))
    # Normalize unicode quotation marks and spaces
    cleaned = cleaned.replace("“", '"').replace("”", '"')
    cleaned = cleaned.replace("‘", "'").replace("’", "'")
    cleaned = cleaned.replace("—", " - ").replace("–", " - ")
    cleaned = cleaned.replace("\u00a0", " ")
    cleaned = cleaned.replace("•", "&bull;")

    # Safe XML escaping without regex lookbehind:
    # 1. Escape ampersands
    cleaned = cleaned.replace("&", "&amp;")
    # 2. Restore any valid entity references
    cleaned = re.sub(r'&amp;(bull|mdash|ndash|lt|gt|quot|apos|amp);', r'&\1;', cleaned)
    # 3. Escape < and >
    cleaned = cleaned.replace("<", "&lt;").replace(">", "&gt;")
    # 4. Restore valid formatting tags
    cleaned = cleaned.replace("&lt;b&gt;", "<b>").replace("&lt;/b&gt;", "</b>")
    cleaned = cleaned.replace("&lt;i&gt;", "<i>").replace("&lt;/i&gt;", "</i>")
    cleaned = cleaned.replace("&lt;u&gt;", "<u>").replace("&lt;/u&gt;", "</u>")
    cleaned = cleaned.replace("&lt;br/&gt;", "<br/>").replace("&lt;br&gt;", "<br/>")
    return cleaned

def is_fresher_profile(resume: TailoredResumeResponse) -> bool:
    """
    Determine if candidate profile is best structured with fresher / project-first layout:
    - 0 professional experience entries
    - Or exactly 1 experience entry that is an internship/training and has >= 1 projects
    """
    if not resume.experience:
        return True
    if len(resume.experience) == 1:
        role = (resume.experience[0].role or "").lower()
        if any(w in role for w in ["intern", "student", "trainee", "fellow", "apprentice"]):
            return True
        if resume.projects and len(resume.projects) >= 2:
            return True
    return False

# ============================================================================
# 1. PLAIN TEXT EXPORT (TXT)
# ============================================================================

def export_txt(resume: TailoredResumeResponse) -> str:
    """Generate clean plain text format of the tailored resume with adaptive section order."""
    lines: List[str] = []
    is_fresher = is_fresher_profile(resume)

    # 1. Candidate Header
    lines.append(normalize_candidate_name(resume.candidate_name).upper())
    contact_parts = []
    if resume.contact_info.email:
        contact_parts.append(resume.contact_info.email)
    if resume.contact_info.phone:
        contact_parts.append(resume.contact_info.phone)
    if resume.contact_info.location:
        contact_parts.append(resume.contact_info.location)
    if resume.contact_info.linkedin:
        contact_parts.append(resume.contact_info.linkedin)
    if resume.contact_info.github:
        contact_parts.append(resume.contact_info.github)
    if resume.contact_info.portfolio:
        contact_parts.append(resume.contact_info.portfolio)
    if contact_parts:
        lines.append(" | ".join(contact_parts))
    lines.append("=" * 60)
    lines.append("")

    # 2. Professional Summary
    if resume.tailored_summary and resume.tailored_summary.strip():
        lines.append("PROFESSIONAL SUMMARY")
        lines.append("-" * 30)
        lines.append(resume.tailored_summary.strip())
        lines.append("")

    # 3. Technical Skills
    if (resume.skills.matching_skills or resume.skills.additional_skills):
        lines.append("TECHNICAL & PROFESSIONAL SKILLS")
        lines.append("-" * 30)
        if resume.skills.matching_skills:
            lines.append(f"Target Role Match: {', '.join(resume.skills.matching_skills)}")
        if resume.skills.additional_skills:
            lines.append(f"Additional Technologies: {', '.join(resume.skills.additional_skills)}")
        lines.append("")

    def append_experience():
        if resume.experience:
            lines.append("PROFESSIONAL EXPERIENCE")
            lines.append("-" * 30)
            for exp in resume.experience:
                header = f"{exp.role} - {exp.company}"
                if exp.duration:
                    header += f" ({exp.duration})"
                if exp.location:
                    header += f" | {exp.location}"
                lines.append(header)
                for bullet in exp.bullets:
                    lines.append(f"  * {bullet}")
                lines.append("")

    def append_projects():
        if resume.projects:
            lines.append("KEY PROJECTS")
            lines.append("-" * 30)
            for proj in resume.projects:
                tech_str = f" [{', '.join(proj.technologies)}]" if proj.technologies else ""
                lines.append(f"{proj.name}{tech_str}")
                if proj.link:
                    lines.append(f"  Link: {proj.link}")
                for bullet in proj.bullets:
                    lines.append(f"  * {bullet}")
                lines.append("")

    def append_education():
        if resume.education:
            lines.append("EDUCATION")
            lines.append("-" * 30)
            for edu in resume.education:
                edu_line = f"{edu.degree}, {edu.institution}"
                if edu.year:
                    edu_line += f" ({edu.year})"
                lines.append(edu_line)
                if edu.details:
                    lines.append(f"  {edu.details}")
            lines.append("")

    def append_certifications():
        if resume.certifications:
            lines.append("CERTIFICATIONS & CREDENTIALS")
            lines.append("-" * 30)
            for cert in resume.certifications:
                lines.append(f"  * {cert}")
            lines.append("")

    # Adaptive section ordering
    if is_fresher:
        append_projects()
        append_education()
        append_experience()
        append_certifications()
    else:
        append_experience()
        append_projects()
        append_education()
        append_certifications()

    # Advisory Missing Keywords (Strictly isolated at bottom)
    if resume.missing_keywords:
        lines.append("=" * 60)
        lines.append("ADVISORY NOTE: RECOMMENDED KEYWORDS FOR THIS JOB DESCRIPTION")
        lines.append("(Note: These were missing from candidate resume and NOT included in qualifications)")
        lines.append("-" * 60)
        for item in resume.missing_keywords:
            lines.append(f"- {item.keyword} ({item.category}): {item.recommendation}")

    return "\n".join(lines)


# ============================================================================
# 2. MICROSOFT WORD EXPORT (DOCX)
# ============================================================================

def export_docx(resume: TailoredResumeResponse) -> bytes:
    """
    Generate professional, ATS-readable DOCX format:
    - Strictly single-column layout
    - Standard identifiable section headings
    - Consistent typography, margins, and standard bullet formatting
    - Adaptive section ordering (fresher vs experienced)
    """
    doc = Document()
    is_fresher = is_fresher_profile(resume)

    # Standard 0.75 in margins
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # 1. Candidate Name Header
    name_p = doc.add_paragraph()
    name_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    name_run = name_p.add_run(normalize_candidate_name(resume.candidate_name))
    name_run.bold = True
    name_run.font.name = "Calibri"
    name_run.font.size = Pt(20)
    name_run.font.color.rgb = RGBColor(30, 41, 59)
    name_p.paragraph_format.space_after = Pt(2)

    # 2. Contact Information Bar
    contact_parts = []
    if resume.contact_info.email:
        contact_parts.append(resume.contact_info.email)
    if resume.contact_info.phone:
        contact_parts.append(resume.contact_info.phone)
    if resume.contact_info.location:
        contact_parts.append(resume.contact_info.location)
    if resume.contact_info.linkedin:
        contact_parts.append(resume.contact_info.linkedin)
    if resume.contact_info.github:
        contact_parts.append(resume.contact_info.github)
    if resume.contact_info.portfolio:
        contact_parts.append(resume.contact_info.portfolio)

    if contact_parts:
        contact_p = doc.add_paragraph()
        contact_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        contact_run = contact_p.add_run("  •  ".join(contact_parts))
        contact_run.font.name = "Calibri"
        contact_run.font.size = Pt(10)
        contact_run.font.color.rgb = RGBColor(71, 85, 105)
        contact_p.paragraph_format.space_after = Pt(12)

    def add_section_heading(title: str):
        h = doc.add_paragraph()
        run = h.add_run(title.upper())
        run.bold = True
        run.font.name = "Calibri"
        run.font.size = Pt(11.5)
        run.font.color.rgb = RGBColor(30, 64, 175) # Navy
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(3)

    # 3. Professional Summary
    if resume.tailored_summary and resume.tailored_summary.strip():
        add_section_heading("Professional Summary")
        sum_p = doc.add_paragraph(resume.tailored_summary.strip())
        sum_p.style.font.name = "Calibri"
        sum_p.style.font.size = Pt(10.5)
        sum_p.paragraph_format.space_after = Pt(6)

    # 4. Technical Skills
    if resume.skills.matching_skills or resume.skills.additional_skills:
        add_section_heading("Technical & Core Skills")
        if resume.skills.matching_skills:
            p = doc.add_paragraph()
            bold = p.add_run("Target Role Match: ")
            bold.bold = True
            bold.font.name = "Calibri"
            bold.font.size = Pt(10)
            p.add_run(", ".join(resume.skills.matching_skills))
            p.paragraph_format.space_after = Pt(2)
        if resume.skills.additional_skills:
            p = doc.add_paragraph()
            bold = p.add_run("Additional Technologies: ")
            bold.bold = True
            bold.font.name = "Calibri"
            bold.font.size = Pt(10)
            p.add_run(", ".join(resume.skills.additional_skills))
            p.paragraph_format.space_after = Pt(6)

    def write_experience():
        if resume.experience:
            add_section_heading("Professional Experience")
            for exp in resume.experience:
                exp_header = doc.add_paragraph()
                role_run = exp_header.add_run(exp.role)
                role_run.bold = True
                role_run.font.name = "Calibri"
                role_run.font.size = Pt(10.5)
                exp_header.add_run(f" | {exp.company}")
                if exp.duration:
                    exp_header.add_run(f" ({exp.duration})")
                if exp.location:
                    exp_header.add_run(f" - {exp.location}")
                exp_header.paragraph_format.space_before = Pt(4)
                exp_header.paragraph_format.space_after = Pt(2)

                for bullet in exp.bullets:
                    b_p = doc.add_paragraph(bullet, style='List Bullet')
                    b_p.paragraph_format.space_after = Pt(2)

    def write_projects():
        if resume.projects:
            add_section_heading("Key Projects")
            for proj in resume.projects:
                proj_p = doc.add_paragraph()
                p_name = proj_p.add_run(proj.name)
                p_name.bold = True
                p_name.font.name = "Calibri"
                p_name.font.size = Pt(10.5)
                if proj.technologies:
                    proj_p.add_run(f" | Technologies: {', '.join(proj.technologies)}")
                if proj.link:
                    proj_p.add_run(f" ({proj.link})")
                proj_p.paragraph_format.space_before = Pt(4)
                proj_p.paragraph_format.space_after = Pt(2)

                for bullet in proj.bullets:
                    b_p = doc.add_paragraph(bullet, style='List Bullet')
                    b_p.paragraph_format.space_after = Pt(2)

    def write_education():
        if resume.education:
            add_section_heading("Education")
            for edu in resume.education:
                edu_p = doc.add_paragraph()
                deg_run = edu_p.add_run(edu.degree)
                deg_run.bold = True
                deg_run.font.name = "Calibri"
                deg_run.font.size = Pt(10.5)
                edu_p.add_run(f" - {edu.institution}")
                if edu.year:
                    edu_p.add_run(f" ({edu.year})")
                edu_p.paragraph_format.space_after = Pt(2)
                if edu.details:
                    det_p = doc.add_paragraph(edu.details)
                    det_p.paragraph_format.space_after = Pt(2)

    def write_certifications():
        if resume.certifications:
            add_section_heading("Certifications & Credentials")
            for cert in resume.certifications:
                c_p = doc.add_paragraph(cert, style='List Bullet')
                c_p.paragraph_format.space_after = Pt(2)

    # Adaptive section ordering
    if is_fresher:
        write_projects()
        write_education()
        write_experience()
        write_certifications()
    else:
        write_experience()
        write_projects()
        write_education()
        write_certifications()

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


# ============================================================================
# 3. HIGH-FIDELITY ATS PDF EXPORT (ReportLab)
# ============================================================================

def export_pdf(resume: TailoredResumeResponse) -> bytes:
    """
    Generate high-fidelity ATS-friendly PDF using ReportLab:
    - Single-column document layout
    - Selectable, extractable clean text stream
    - Standard section headings with clean rule dividers
    - XML/Character sanitization avoiding ReportLab parsing crashes
    - Adaptive section ordering (fresher vs experienced)
    - Full representation of Projects, Education, and Certifications
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.55 * inch,
        rightMargin=0.55 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch
    )

    styles = getSampleStyleSheet()
    is_fresher = is_fresher_profile(resume)

    # Typography styles with accessible sizing
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontSize=18,
        leading=22,
        fontName='Helvetica-Bold',
        textColor=COLOR_PRIMARY,
        alignment=1, # Center
        spaceAfter=3
    )

    contact_style = ParagraphStyle(
        'ContactBar',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=11,
        fontName='Helvetica',
        textColor=COLOR_MUTED,
        alignment=1,
        spaceAfter=8
    )

    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=10.5,
        leading=13,
        fontName='Helvetica-Bold',
        textColor=COLOR_SECONDARY,
        spaceBefore=7,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        leading=12.5,
        fontName='Helvetica',
        textColor=COLOR_TEXT,
        spaceAfter=3
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontSize=9,
        leading=12.5,
        fontName='Helvetica',
        textColor=COLOR_TEXT,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=2
    )

    role_style = ParagraphStyle(
        'RoleTitle',
        parent=styles['Normal'],
        fontSize=9.5,
        leading=13,
        fontName='Helvetica-Bold',
        textColor=COLOR_PRIMARY,
        spaceBefore=3,
        spaceAfter=2,
        keepWithNext=True
    )

    elements = []

    # 1. Candidate Name
    elements.append(Paragraph(clean_pdf_text(normalize_candidate_name(resume.candidate_name)), title_style))

    # 2. Contact Information
    contact_parts = []
    if resume.contact_info.email:
        contact_parts.append(clean_pdf_text(resume.contact_info.email))
    if resume.contact_info.phone:
        contact_parts.append(clean_pdf_text(resume.contact_info.phone))
    if resume.contact_info.location:
        contact_parts.append(clean_pdf_text(resume.contact_info.location))
    if resume.contact_info.linkedin:
        contact_parts.append(clean_pdf_text(resume.contact_info.linkedin))
    if resume.contact_info.github:
        contact_parts.append(clean_pdf_text(resume.contact_info.github))
    if resume.contact_info.portfolio:
        contact_parts.append(clean_pdf_text(resume.contact_info.portfolio))

    if contact_parts:
        elements.append(Paragraph(" &bull; ".join(contact_parts), contact_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=COLOR_LINE, spaceAfter=6))

    # 3. Professional Summary
    if resume.tailored_summary and resume.tailored_summary.strip():
        elements.append(Paragraph("PROFESSIONAL SUMMARY", section_style))
        elements.append(Paragraph(clean_pdf_text(resume.tailored_summary.strip()), body_style))
        elements.append(Spacer(1, 3))

    # 4. Technical Skills
    if resume.skills.matching_skills or resume.skills.additional_skills:
        elements.append(Paragraph("TECHNICAL & CORE SKILLS", section_style))
        if resume.skills.matching_skills:
            clean_match = clean_pdf_text(', '.join(resume.skills.matching_skills))
            elements.append(Paragraph(f"<b>Target Role Match:</b> {clean_match}", body_style))
        if resume.skills.additional_skills:
            clean_add = clean_pdf_text(', '.join(resume.skills.additional_skills))
            elements.append(Paragraph(f"<b>Additional Technologies:</b> {clean_add}", body_style))
        elements.append(Spacer(1, 3))

    def build_experience_flowables():
        if resume.experience:
            elements.append(Paragraph("PROFESSIONAL EXPERIENCE", section_style))
            for exp in resume.experience:
                dur_str = f" ({clean_pdf_text(exp.duration)})" if exp.duration else ""
                loc_str = f" | {clean_pdf_text(exp.location)}" if exp.location else ""
                header_text = f"<b>{clean_pdf_text(exp.role)}</b> &mdash; {clean_pdf_text(exp.company)}{dur_str}{loc_str}"
                
                exp_elements = [Paragraph(header_text, role_style)]
                if exp.bullets:
                    # Keep role header with first bullet to prevent orphan headers
                    exp_elements.append(Paragraph(f"&bull; {clean_pdf_text(exp.bullets[0])}", bullet_style))
                    elements.append(KeepTogether(exp_elements))
                    for b in exp.bullets[1:]:
                        elements.append(Paragraph(f"&bull; {clean_pdf_text(b)}", bullet_style))
                else:
                    elements.append(KeepTogether(exp_elements))
                elements.append(Spacer(1, 2))

    def build_projects_flowables():
        if resume.projects:
            elements.append(Paragraph("KEY PROJECTS", section_style))
            for proj in resume.projects:
                tech_str = f" [{clean_pdf_text(', '.join(proj.technologies))}]" if proj.technologies else ""
                proj_elements = [Paragraph(f"<b>{clean_pdf_text(proj.name)}</b>{tech_str}", role_style)]
                if proj.bullets:
                    proj_elements.append(Paragraph(f"&bull; {clean_pdf_text(proj.bullets[0])}", bullet_style))
                    elements.append(KeepTogether(proj_elements))
                    for b in proj.bullets[1:]:
                        elements.append(Paragraph(f"&bull; {clean_pdf_text(b)}", bullet_style))
                else:
                    elements.append(KeepTogether(proj_elements))
                elements.append(Spacer(1, 2))

    def build_education_flowables():
        if resume.education:
            elements.append(Paragraph("EDUCATION", section_style))
            for edu in resume.education:
                yr_str = f" ({clean_pdf_text(edu.year)})" if edu.year else ""
                edu_text = f"<b>{clean_pdf_text(edu.degree)}</b> &mdash; {clean_pdf_text(edu.institution)}{yr_str}"
                elements.append(Paragraph(edu_text, body_style))
                if edu.details:
                    elements.append(Paragraph(clean_pdf_text(edu.details), body_style))
            elements.append(Spacer(1, 3))

    def build_certifications_flowables():
        if resume.certifications:
            elements.append(Paragraph("CERTIFICATIONS & CREDENTIALS", section_style))
            for cert in resume.certifications:
                elements.append(Paragraph(f"&bull; {clean_pdf_text(cert)}", bullet_style))
            elements.append(Spacer(1, 3))

    # Adaptive section ordering
    if is_fresher:
        build_projects_flowables()
        build_education_flowables()
        build_experience_flowables()
        build_certifications_flowables()
    else:
        build_experience_flowables()
        build_projects_flowables()
        build_education_flowables()
        build_certifications_flowables()

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


# ============================================================================
# 4. COVER LETTER PDF EXPORT
# ============================================================================

def export_cover_letter_pdf(
    candidate_name: str,
    contact_info_line: str,
    cover_letter_text: str,
    target_role: str = "Position"
) -> bytes:
    """Generate executive letterhead PDF for tailored cover letter."""
    candidate_name = normalize_candidate_name(candidate_name) or "Candidate Name"
    formatted_text = format_cover_letter_with_verified_signature(cover_letter_text, candidate_name)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CLName',
        parent=styles['Normal'],
        fontSize=18,
        leading=22,
        fontName='Helvetica-Bold',
        textColor=COLOR_PRIMARY,
        alignment=0, # Left
        spaceAfter=2
    )

    contact_style = ParagraphStyle(
        'CLContact',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        fontName='Helvetica',
        textColor=COLOR_MUTED,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        'CLBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=15,
        fontName='Helvetica',
        textColor=COLOR_TEXT,
        spaceAfter=12
    )

    elements = []

    # Header Letterhead
    elements.append(Paragraph(clean_pdf_text(candidate_name), title_style))
    if contact_info_line:
        elements.append(Paragraph(clean_pdf_text(contact_info_line), contact_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_SECONDARY, spaceAfter=18))

    # Body paragraphs
    paragraphs = formatted_text.strip().split("\n\n")
    for para in paragraphs:
        cleaned_para = clean_pdf_text(para.strip()).replace("\n", "<br/>")
        if cleaned_para:
            elements.append(Paragraph(cleaned_para, body_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
