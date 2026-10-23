import io
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
    Table,
    TableStyle,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models.schemas import TailoredResumeResponse

# Palette for PDF
COLOR_PRIMARY = HexColor("#1E293B")     # Slate 800
COLOR_SECONDARY = HexColor("#2563EB")   # Royal Blue
COLOR_TEXT = HexColor("#334155")        # Slate 700
COLOR_MUTED = HexColor("#64748B")       # Slate 500
COLOR_LINE = HexColor("#E2E8F0")        # Slate 200

def export_txt(resume: TailoredResumeResponse) -> str:
    """Generate clean plain text format of the tailored resume."""
    lines = []
    
    # Header
    lines.append(resume.candidate_name.upper())
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
    if contact_parts:
        lines.append(" | ".join(contact_parts))
    lines.append("=" * 60)
    lines.append("")
    
    # Summary
    lines.append("PROFESSIONAL SUMMARY")
    lines.append("-" * 30)
    lines.append(resume.tailored_summary)
    lines.append("")
    
    # Skills
    lines.append("TECHNICAL & PROFESSIONAL SKILLS")
    lines.append("-" * 30)
    if resume.skills.matching_skills:
        lines.append(f"Target Role Match: {', '.join(resume.skills.matching_skills)}")
    if resume.skills.additional_skills:
        lines.append(f"Additional Skills: {', '.join(resume.skills.additional_skills)}")
    lines.append("")
    
    # Experience
    lines.append("PROFESSIONAL EXPERIENCE")
    lines.append("-" * 30)
    for exp in resume.experience:
        header = f"{exp.role} - {exp.company}"
        if exp.duration:
            header += f" ({exp.duration})"
        lines.append(header)
        for bullet in exp.bullets:
            lines.append(f"  * {bullet}")
        lines.append("")
        
    # Education
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
        
    # Projects
    if resume.projects:
        lines.append("KEY PROJECTS")
        lines.append("-" * 30)
        for proj in resume.projects:
            lines.append(f"{proj.name} [{' ,'.join(proj.technologies)}]")
            for bullet in proj.bullets:
                lines.append(f"  * {bullet}")
            lines.append("")
            
    # Certifications
    if resume.certifications:
        lines.append("CERTIFICATIONS")
        lines.append("-" * 30)
        for cert in resume.certifications:
            lines.append(f"  * {cert}")
        lines.append("")
        
    # Advisory missing keywords (Strictly separated)
    if resume.missing_keywords:
        lines.append("=" * 60)
        lines.append("ADVISORY NOTE: RECOMMENDED KEYWORDS FOR THIS JOB DESCRIPTION")
        lines.append("(Note: These were missing from your resume and NOT included in qualifications)")
        lines.append("-" * 60)
        for item in resume.missing_keywords:
            lines.append(f"- {item.keyword} ({item.category}): {item.recommendation}")
            
    return "\n".join(lines)

def export_docx(resume: TailoredResumeResponse) -> bytes:
    """Generate professional DOCX format of tailored resume."""
    doc = Document()
    
    # Set standard margins (0.75 in)
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)
        
    # Name Header
    name_p = doc.add_paragraph()
    name_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    name_run = name_p.add_run(resume.candidate_name)
    name_run.bold = True
    name_run.font.size = Pt(20)
    name_run.font.color.rgb = RGBColor(30, 41, 59)
    name_p.paragraph_format.space_after = Pt(2)
    
    # Contact Info Bar
    contact_p = doc.add_paragraph()
    contact_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
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
        
    contact_run = contact_p.add_run("  •  ".join(contact_parts))
    contact_run.font.size = Pt(9.5)
    contact_run.font.color.rgb = RGBColor(100, 116, 139)
    contact_p.paragraph_format.space_after = Pt(14)
    
    def add_section_heading(title: str):
        h = doc.add_paragraph()
        run = h.add_run(title.upper())
        run.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(37, 99, 235)
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(4)
        
    # Professional Summary
    add_section_heading("Professional Summary")
    sum_p = doc.add_paragraph(resume.tailored_summary)
    sum_p.paragraph_format.space_after = Pt(8)
    
    # Skills
    add_section_heading("Core Qualifications & Technical Skills")
    if resume.skills.matching_skills:
        p = doc.add_paragraph()
        bold = p.add_run("Key JD Alignment: ")
        bold.bold = True
        p.add_run(", ".join(resume.skills.matching_skills))
        p.paragraph_format.space_after = Pt(3)
    if resume.skills.additional_skills:
        p = doc.add_paragraph()
        bold = p.add_run("Additional Expertise: ")
        bold.bold = True
        p.add_run(", ".join(resume.skills.additional_skills))
        p.paragraph_format.space_after = Pt(8)
        
    # Experience
    add_section_heading("Professional Experience")
    for exp in resume.experience:
        exp_header = doc.add_paragraph()
        role_run = exp_header.add_run(exp.role)
        role_run.bold = True
        exp_header.add_run(f" | {exp.company}")
        if exp.duration:
            exp_header.add_run(f" ({exp.duration})")
        exp_header.paragraph_format.space_after = Pt(2)
        
        for bullet in exp.bullets:
            b_p = doc.add_paragraph(bullet, style='List Bullet')
            b_p.paragraph_format.space_after = Pt(2)
        doc.add_paragraph().paragraph_format.space_after = Pt(4)
        
    # Education
    if resume.education:
        add_section_heading("Education")
        for edu in resume.education:
            edu_p = doc.add_paragraph()
            deg_run = edu_p.add_run(edu.degree)
            deg_run.bold = True
            edu_p.add_run(f" - {edu.institution}")
            if edu.year:
                edu_p.add_run(f" ({edu.year})")
            edu_p.paragraph_format.space_after = Pt(4)
            
    # Projects
    if resume.projects:
        add_section_heading("Key Projects")
        for proj in resume.projects:
            proj_p = doc.add_paragraph()
            p_name = proj_p.add_run(proj.name)
            p_name.bold = True
            if proj.technologies:
                proj_p.add_run(f" | Technologies: {', '.join(proj.technologies)}")
            proj_p.paragraph_format.space_after = Pt(2)
            for bullet in proj.bullets:
                doc.add_paragraph(bullet, style='List Bullet')
                
    # Output to bytes
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()

def export_pdf(resume: TailoredResumeResponse) -> bytes:
    """Generate high-fidelity ATS-friendly PDF using ReportLab."""
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
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontSize=18,
        leading=22,
        fontName='Helvetica-Bold',
        textColor=COLOR_PRIMARY,
        alignment=1, # Center
        spaceAfter=4
    )
    
    contact_style = ParagraphStyle(
        'ContactBar',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=11,
        fontName='Helvetica',
        textColor=COLOR_MUTED,
        alignment=1,
        spaceAfter=10
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Normal'],
        fontSize=11,
        leading=14,
        fontName='Helvetica-Bold',
        textColor=COLOR_SECONDARY,
        spaceBefore=8,
        spaceAfter=3
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        fontName='Helvetica',
        textColor=COLOR_TEXT,
        spaceAfter=4
    )
    
    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
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
        spaceBefore=4,
        spaceAfter=2
    )
    
    elements = []
    
    # Candidate Name
    elements.append(Paragraph(resume.candidate_name, title_style))
    
    # Contact Info
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
    elements.append(Paragraph(" &bull; ".join(contact_parts), contact_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=COLOR_LINE, spaceAfter=8))
    
    # Summary
    elements.append(Paragraph("PROFESSIONAL SUMMARY", section_style))
    elements.append(Paragraph(resume.tailored_summary, body_style))
    elements.append(Spacer(1, 4))
    
    # Skills
    elements.append(Paragraph("CORE QUALIFICATIONS & SKILLS", section_style))
    if resume.skills.matching_skills:
        elements.append(Paragraph(f"<b>Key JD Alignment:</b> {', '.join(resume.skills.matching_skills)}", body_style))
    if resume.skills.additional_skills:
        elements.append(Paragraph(f"<b>Additional Capabilities:</b> {', '.join(resume.skills.additional_skills)}", body_style))
    elements.append(Spacer(1, 4))
    
    # Experience
    elements.append(Paragraph("PROFESSIONAL EXPERIENCE", section_style))
    for exp in resume.experience:
        duration_str = f" ({exp.duration})" if exp.duration else ""
        header_text = f"<b>{exp.role}</b> &mdash; {exp.company}{duration_str}"
        elements.append(Paragraph(header_text, role_style))
        for bullet in exp.bullets:
            elements.append(Paragraph(f"&bull; {bullet}", bullet_style))
        elements.append(Spacer(1, 3))
        
    # Education
    if resume.education:
        elements.append(Paragraph("EDUCATION", section_style))
        for edu in resume.education:
            year_str = f" ({edu.year})" if edu.year else ""
            elements.append(Paragraph(f"<b>{edu.degree}</b> &mdash; {edu.institution}{year_str}", body_style))
        elements.append(Spacer(1, 4))
        
    # Projects
    if resume.projects:
        elements.append(Paragraph("KEY PROJECTS", section_style))
        for proj in resume.projects:
            tech_str = f" [{', '.join(proj.technologies)}]" if proj.technologies else ""
            elements.append(Paragraph(f"<b>{proj.name}</b>{tech_str}", role_style))
            for bullet in proj.bullets:
                elements.append(Paragraph(f"&bull; {bullet}", bullet_style))
        elements.append(Spacer(1, 4))
        
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
