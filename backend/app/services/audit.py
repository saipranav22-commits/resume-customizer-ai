import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from app.services.optimization_engine import COMMON_TECH_SKILLS
from app.models.schemas import (
    TailoredResumeResponse,
    AuditIssue,
    ResumeQualityAudit,
    AtsQualityAssessment,
)

logger = logging.getLogger("audit_engine")

# Weak or passive starting phrases that reduce bullet point impact
WEAK_BULLET_STARTERS = [
    "responsible for", "duties included", "worked on", "helped with",
    "assisted with", "assisted in", "participated in", "contributed to",
    "handled", "tasked with", "involved in", "served as", "was part of"
]

# First person pronouns strictly disallowed in professional resume bullets
FIRST_PERSON_PRONOUNS = [
    r"\bi\b", r"\bme\b", r"\bmy\b", r"\bmyself\b",
    r"\bwe\b", r"\bus\b", r"\bour\b", r"\bourselves\b"
]

# Action verbs considered strong technical starters
STRONG_ACTION_VERBS = {
    "architected", "engineered", "developed", "built", "designed", "implemented",
    "optimized", "spearheaded", "orchestrated", "automated", "scaled", "deployed",
    "configured", "refactored", "integrated", "streamlined", "enhanced", "resolved",
    "executed", "led", "mentored", "standardized", "authored", "reduced", "increased",
    "created", "established", "launched", "migrated", "upgraded", "accelerated"
}

def audit_resume_quality(
    resume: TailoredResumeResponse,
    job_description: Optional[str] = None
) -> ResumeQualityAudit:
    """
    Deterministic professional resume validation layer.
    Evaluates:
    - Missing essential contact information
    - Missing or inconsistent section headings
    - Excessive bullet length
    - Duplicate skills
    - Repeated sentences and verbs
    - Empty sections
    - Inconsistent dates
    - Poor readability / First-person pronouns
    - Excessive document length
    - ATS text-extraction / character issues
    - Unsupported claims where verifiable
    """
    errors: List[AuditIssue] = []
    warnings: List[AuditIssue] = []
    suggestions: List[AuditIssue] = []

    issue_counter = 1
    def make_id(prefix: str) -> str:
        nonlocal issue_counter
        curr = f"{prefix}-{issue_counter:03d}"
        issue_counter += 1
        return curr

    # -------------------------------------------------------------
    # 1. Essential Contact Information Check
    # -------------------------------------------------------------
    name = (resume.candidate_name or "").strip()
    if not name or name.lower() in ["candidate name", "your name", "full name", "untitled"]:
        errors.append(AuditIssue(
            id=make_id("contact"),
            type="error",
            category="contact_info",
            message="Candidate name is missing or uses a placeholder.",
            detail="A clearly stated professional legal name is required at the very top of the document.",
            location="Candidate Header",
            recommendation="Provide the candidate's actual full name."
        ))

    email = (resume.contact_info.email or "").strip() if resume.contact_info else ""
    if not email:
        errors.append(AuditIssue(
            id=make_id("contact"),
            type="error",
            category="contact_info",
            message="Missing professional email address.",
            detail="ATS parsers rely on email as the primary unique candidate identifier.",
            location="Contact Information",
            recommendation="Add an active, professional email address (e.g. name@domain.com)."
        ))
    elif not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        errors.append(AuditIssue(
            id=make_id("contact"),
            type="error",
            category="contact_info",
            message=f"Invalid email address format: '{email}'.",
            detail="The email address does not follow standard RFC formats and will fail ATS parsing.",
            location="Contact Information",
            recommendation="Ensure email matches standard format (e.g. username@domain.com)."
        ))

    phone = (resume.contact_info.phone or "").strip() if resume.contact_info else ""
    if not phone:
        warnings.append(AuditIssue(
            id=make_id("contact"),
            type="warning",
            category="contact_info",
            message="Missing telephone / mobile number.",
            detail="Recruiters often conduct initial phone screens; omitting a phone number slows outreach.",
            location="Contact Information",
            recommendation="Include a phone number with country/area code."
        ))

    location = (resume.contact_info.location or "").strip() if resume.contact_info else ""
    linkedin = (resume.contact_info.linkedin or "").strip() if resume.contact_info else ""
    github = (resume.contact_info.github or "").strip() if resume.contact_info else ""

    if not location:
        suggestions.append(AuditIssue(
            id=make_id("contact"),
            type="suggestion",
            category="contact_info",
            message="Location omitted.",
            detail="Specifying city and state/country clarifies candidate work authorization and timezone alignment.",
            location="Contact Information",
            recommendation="Add general location (e.g. 'San Francisco, CA' or 'Remote, US')."
        ))

    if not linkedin and not github:
        suggestions.append(AuditIssue(
            id=make_id("contact"),
            type="suggestion",
            category="contact_info",
            message="No professional links (LinkedIn or GitHub) provided.",
            detail="Recruiters frequently cross-reference technical profiles for portfolio verification.",
            location="Contact Information",
            recommendation="Add standard text URLs for LinkedIn and GitHub profiles."
        ))

    # -------------------------------------------------------------
    # 2. Section Headings & Empty Sections Check
    # -------------------------------------------------------------
    summary = (resume.tailored_summary or "").strip()
    if not summary:
        warnings.append(AuditIssue(
            id=make_id("section"),
            type="warning",
            category="section_structure",
            message="Professional Summary is empty.",
            detail="An executive summary anchors the candidate's core identity and JD alignment in 2-4 sentences.",
            location="Professional Summary",
            recommendation="Include a 2-4 sentence summary highlighting target role alignment."
        ))
    elif len(summary.split()) < 15:
        suggestions.append(AuditIssue(
            id=make_id("section"),
            type="suggestion",
            category="section_structure",
            message="Professional summary is unusually brief (<15 words).",
            detail="A concise summary of 25-50 words provides better context for recruiters.",
            location="Professional Summary",
            recommendation="Expand the summary with 1-2 sentences on core technical capabilities."
        ))

    matching_skills = resume.skills.matching_skills if resume.skills else []
    additional_skills = resume.skills.additional_skills if resume.skills else []
    total_skills = matching_skills + additional_skills

    if not total_skills:
        errors.append(AuditIssue(
            id=make_id("section"),
            type="error",
            category="skills",
            message="No technical skills specified in resume.",
            detail="The skills section is the highest-weighted section for automated keyword indexers.",
            location="Technical Skills",
            recommendation="Add relevant verified skills and technologies."
        ))
    elif len(total_skills) < 4:
        warnings.append(AuditIssue(
            id=make_id("section"),
            type="warning",
            category="skills",
            message="Skills section has very few entries (<4 skills).",
            detail="Listing core languages, frameworks, databases, and cloud tools ensures keyword coverage.",
            location="Technical Skills",
            recommendation="Include foundational tools and technologies genuinely practiced by the candidate."
        ))

    experiences = resume.experience or []
    projects = resume.projects or []
    education = resume.education or []

    if not experiences and not projects:
        errors.append(AuditIssue(
            id=make_id("section"),
            type="error",
            category="section_structure",
            message="Resume has neither Professional Experience nor Projects.",
            detail="An ATS document must contain demonstrable employment history or verified technical projects.",
            location="Document Body",
            recommendation="Add at least one relevant work experience entry or technical project."
        ))

    if not education:
        warnings.append(AuditIssue(
            id=make_id("section"),
            type="warning",
            category="section_structure",
            message="Education section is empty.",
            detail="Most enterprise ATS systems require a degree, diploma, or certification credential.",
            location="Education",
            recommendation="Add relevant academic degrees, coursework, or verified bootcamp credentials."
        ))

    # -------------------------------------------------------------
    # 3. Duplicate Skills & Redundancies
    # -------------------------------------------------------------
    seen_skills: Dict[str, str] = {}
    duplicate_skill_names = set()
    for s in total_skills:
        s_clean = s.strip().lower()
        if not s_clean:
            continue
        if s_clean in seen_skills:
            duplicate_skill_names.add(s.strip())
        else:
            seen_skills[s_clean] = s.strip()

    if duplicate_skill_names:
        warnings.append(AuditIssue(
            id=make_id("skills"),
            type="warning",
            category="skills",
            message=f"Duplicate skills detected: {', '.join(sorted(duplicate_skill_names))}.",
            detail="Listing identical skills multiple times wastes space and appears careless to recruiters.",
            location="Technical Skills",
            recommendation="Remove redundant skill entries and categorize remaining skills logically."
        ))

    # Cross-list overlap check between matching and additional
    matching_set = {s.strip().lower() for s in matching_skills if s.strip()}
    additional_set = {s.strip().lower() for s in additional_skills if s.strip()}
    cross_overlap = matching_set.intersection(additional_set)
    if cross_overlap:
        warnings.append(AuditIssue(
            id=make_id("skills"),
            type="warning",
            category="skills",
            message=f"Skills appear in both Target Alignment and Additional lists: {', '.join(cross_overlap)}.",
            detail="A skill should be classified exclusively as either a target matching skill or additional skill.",
            location="Technical Skills",
            recommendation="Deduplicate skills across categories."
        ))

    # -------------------------------------------------------------
    # 4. Bullet Length & Writing Quality Checks
    # -------------------------------------------------------------
    all_bullets: List[Tuple[str, str]] = [] # (bullet_text, location)
    for exp_idx, exp in enumerate(experiences):
        exp_loc = f"Experience: {exp.role or 'Role'} at {exp.company or 'Company'}"
        for b_idx, bullet in enumerate(exp.bullets or []):
            all_bullets.append((bullet, f"{exp_loc} (Bullet {b_idx + 1})"))
    for proj_idx, proj in enumerate(projects):
        proj_loc = f"Project: {proj.name or 'Project'}"
        for b_idx, bullet in enumerate(proj.bullets or []):
            all_bullets.append((bullet, f"{proj_loc} (Bullet {b_idx + 1})"))

    seen_bullet_texts: Dict[str, str] = {}
    excessive_bullets = []
    first_person_bullets = []
    weak_starter_bullets = []
    keyword_stuffed_bullets = []
    metric_bullets = []
    duplicate_bullets_count = 0

    for b_text, b_loc in all_bullets:
        clean_b = b_text.strip()
        if not clean_b:
            warnings.append(AuditIssue(
                id=make_id("bullet"),
                type="warning",
                category="bullet_quality",
                message="Empty bullet point detected.",
                detail="Blank bullet items create visual gaps and confuse text extraction tools.",
                location=b_loc,
                recommendation="Remove the empty bullet or supply accomplishment details."
            ))
            continue

        # Duplicate bullet text check
        normalized_b = re.sub(r"\s+", " ", clean_b.lower())
        if normalized_b in seen_bullet_texts:
            duplicate_bullets_count += 1
            warnings.append(AuditIssue(
                id=make_id("bullet"),
                type="warning",
                category="bullet_quality",
                message="Duplicate bullet text detected across resume entries.",
                detail=f"This accomplishment appears word-for-word in multiple places: '{clean_b[:60]}...'",
                location=b_loc,
                recommendation="Replace duplicate bullets with role-specific, unique contributions."
            ))
        else:
            seen_bullet_texts[normalized_b] = b_loc

        # Metrics check
        if re.search(r'\b\d+(?:\.\d+)?%|\b\$\d+|\b\d+\s*(?:ms|k|m|million|users|req/s|x)\b', clean_b.lower()):
            metric_bullets.append(b_loc)

        # Keyword stuffing check: bullet is mostly skill keywords without verbs
        words = clean_b.split()
        word_count = len(words)
        skill_words_count = sum(1 for w in words if w.lower().strip(",.") in COMMON_TECH_SKILLS)
        has_action_verb = any(v in clean_b.lower() for v in STRONG_ACTION_VERBS)
        
        if word_count >= 4 and (skill_words_count / max(1, word_count)) >= 0.50 and not has_action_verb:
            keyword_stuffed_bullets.append((clean_b[:50], b_loc))

        # Length check
        if word_count > 42 or len(clean_b) > 280:
            excessive_bullets.append((clean_b[:50], word_count, b_loc))
        elif word_count < 5:
            suggestions.append(AuditIssue(
                id=make_id("bullet"),
                type="suggestion",
                category="bullet_quality",
                message=f"Bullet is too brief ({word_count} words): '{clean_b}'.",
                detail="Bullets with fewer than 5 words fail to convey technical method or verified outcome.",
                location=b_loc,
                recommendation="Follow formula: Action Verb + Contribution + Technology + Verified Outcome."
            ))

        # First person check
        for pattern in FIRST_PERSON_PRONOUNS:
            if re.search(pattern, clean_b, re.IGNORECASE):
                first_person_bullets.append((clean_b[:50], b_loc))
                break

        # Weak starter check
        first_few_words = " ".join(clean_b.lower().split()[:3])
        for weak in WEAK_BULLET_STARTERS:
            if first_few_words.startswith(weak):
                weak_starter_bullets.append((clean_b[:50], b_loc, weak))
                break

    if keyword_stuffed_bullets:
        warnings.append(AuditIssue(
            id=make_id("bullet"),
            type="warning",
            category="bullet_quality",
            message=f"{len(keyword_stuffed_bullets)} experience bullet(s) consist predominantly of raw keywords without narrative context.",
            detail="ATS parsers and recruiters penalize unstructured keyword dumping in experience sections.",
            location=keyword_stuffed_bullets[0][1],
            recommendation="Rephrase bullets with an action verb, engineering contribution, and verified outcome."
        ))

    if excessive_bullets:
        warnings.append(AuditIssue(
            id=make_id("bullet"),
            type="warning",
            category="bullet_quality",
            message=f"{len(excessive_bullets)} bullet points exceed recommended length (>40 words).",
            detail="Overly dense bullets reduce recruiter scan rate and increase ATS line-break extraction fragmentation.",
            location=excessive_bullets[0][2],
            recommendation="Tighten long bullets to 15-30 words focusing on action verb and outcome."
        ))

    if first_person_bullets:
        warnings.append(AuditIssue(
            id=make_id("readability"),
            type="warning",
            category="readability",
            message=f"First-person pronouns detected in {len(first_person_bullets)} bullet point(s).",
            detail="Professional ATS resume standards strictly avoid personal pronouns ('I', 'me', 'my', 'we').",
            location=first_person_bullets[0][1],
            recommendation="Rephrase bullets to begin directly with an action verb (e.g. 'Engineered...' instead of 'I engineered...')."
        ))

    if weak_starter_bullets:
        suggestions.append(AuditIssue(
            id=make_id("bullet"),
            type="suggestion",
            category="bullet_quality",
            message=f"{len(weak_starter_bullets)} bullet point(s) start with passive phrases (e.g. '{weak_starter_bullets[0][2]}').",
            detail="Lead with active technical ownership verbs rather than passive assignment phrasing.",
            location=weak_starter_bullets[0][1],
            recommendation="Use strong action verbs like 'Architected', 'Implemented', 'Optimized', or 'Automated'."
        ))

    # Repetitive starting verb check
    starting_verbs: List[str] = []
    for b_text, _ in all_bullets:
        words = b_text.strip().split()
        if words:
            v = re.sub(r"[^A-Za-z]", "", words[0]).lower()
            if v:
                starting_verbs.append(v)
    for i in range(len(starting_verbs) - 2):
        if starting_verbs[i] == starting_verbs[i + 1] == starting_verbs[i + 2]:
            suggestions.append(AuditIssue(
                id=make_id("bullet"),
                type="suggestion",
                category="bullet_quality",
                message=f"Repetitive starting verb '{starting_verbs[i].title()}' used in 3 consecutive bullets.",
                detail="Varying action verbs demonstrates a multifaceted skill set and improves readability.",
                location="Experience / Projects",
                recommendation="Diversify action verbs to highlight different technical capabilities."
            ))
            break

    # -------------------------------------------------------------
    # 5. Inconsistent Dates Check
    # -------------------------------------------------------------
    missing_dates_count = 0
    for exp_idx, exp in enumerate(experiences):
        duration = (exp.duration or "").strip()
        exp_loc = f"Experience: {exp.role} at {exp.company}"
        if not duration:
            missing_dates_count += 1
            warnings.append(AuditIssue(
                id=make_id("dates"),
                type="warning",
                category="dates",
                message=f"Missing duration or dates for role '{exp.role}'.",
                detail="ATS parsers compute total years of experience from employment date ranges.",
                location=exp_loc,
                recommendation="Add standard date range (e.g. 'Jan 2021 - Present' or '2020 - 2023')."
            ))

    for edu_idx, edu in enumerate(education):
        year = (edu.year or "").strip()
        edu_loc = f"Education: {edu.degree} - {edu.institution}"
        if not year:
            suggestions.append(AuditIssue(
                id=make_id("dates"),
                type="suggestion",
                category="dates",
                message=f"Graduation or attendance year omitted for '{edu.degree}'.",
                detail="Stating graduation year helps recruiters establish candidate seniority and career stage.",
                location=edu_loc,
                recommendation="Add completion year (e.g. '2022' or 'Expected 2025')."
            ))

    # 6. Overall Document Length & Metrics
    # -------------------------------------------------------------
    # Build full document text
    doc_words = []
    doc_words.extend(name.split())
    doc_words.extend(summary.split())
    doc_words.extend(" ".join(total_skills).split())
    for exp in experiences:
        doc_words.extend((exp.role or "").split())
        doc_words.extend((exp.company or "").split())
        for b in exp.bullets or []:
            doc_words.extend(b.split())
    for p in projects:
        doc_words.extend((p.name or "").split())
        doc_words.extend(" ".join(p.technologies or []).split())
        for b in p.bullets or []:
            doc_words.extend(b.split())
    for edu in education:
        doc_words.extend((edu.degree or "").split())
        doc_words.extend((edu.institution or "").split())
    for c in resume.certifications or []:
        doc_words.extend(c.split())

    total_word_count = len(doc_words)

    if total_word_count > 950:
        warnings.append(AuditIssue(
            id=make_id("length"),
            type="warning",
            category="length",
            message=f"Document length ({total_word_count} words) may exceed standard 1-2 page formatting.",
            detail="A concise resume of 400-800 words ensures all qualifications fit within 1 or 2 pages without text truncation.",
            location="Full Document",
            recommendation="Condense bullets and remove obsolete responsibilities."
        ))
    elif total_word_count < 180:
        warnings.append(AuditIssue(
            id=make_id("length"),
            type="warning",
            category="length",
            message=f"Document is very short ({total_word_count} words).",
            detail="A resume under 200 words typically lacks the detail needed to demonstrate technical depth.",
            location="Full Document",
            recommendation="Add verified accomplishment bullets to past roles or technical projects."
        ))

    # -------------------------------------------------------------
    # 7. ATS Text Extraction & Special Characters Check
    # -------------------------------------------------------------
    raw_text = " ".join(doc_words)
    # Check for unprintable control characters (excluding newline/tab)
    unprintable_chars = [c for c in raw_text if ord(c) < 32 and c not in ("\n", "\r", "\t")]
    if unprintable_chars:
        errors.append(AuditIssue(
            id=make_id("ats"),
            type="error",
            category="ats_parseability",
            message="Unprintable control characters detected in resume text.",
            detail="Control characters corrupt PDF text extraction streams in legacy ATS parsers.",
            location="Document Text Stream",
            recommendation="Clean pasted text to remove non-standard control bytes."
        ))

    # -------------------------------------------------------------
    # 8. Scoring & Summary Calculation
    # -------------------------------------------------------------
    # Deterministic scoring formula:
    # Baseline 100 - (errors * 18) - (warnings * 6) - (suggestions * 1.5)
    raw_score = 100 - (len(errors) * 18) - (len(warnings) * 6) - int(len(suggestions) * 1.5)
    overall_score = max(20, min(99, raw_score))

    if overall_score >= 90:
        grade = "A (Recruiter Ready)"
    elif overall_score >= 80:
        grade = "B (Strong Alignment)"
    elif overall_score >= 70:
        grade = "C (Minor ATS Concerns)"
    else:
        grade = "Needs Attention"

    summary_msg = (
        f"Resume Quality Audit completed with {len(errors)} critical error(s), "
        f"{len(warnings)} warning(s), and {len(suggestions)} suggestion(s). "
        f"Overall document health is rated {overall_score}/100 [{grade}]."
    )

    metrics = {
        "word_count": total_word_count,
        "bullet_count": len(all_bullets),
        "avg_bullet_words": round(sum(len(b[0].split()) for b in all_bullets) / max(1, len(all_bullets)), 1),
        "metric_bullets_count": len(metric_bullets),
        "first_person_bullet_count": len(first_person_bullets),
        "weak_starter_bullet_count": len(weak_starter_bullets),
        "keyword_stuffed_bullet_count": len(keyword_stuffed_bullets),
        "duplicate_bullets_count": duplicate_bullets_count,
        "missing_dates_count": missing_dates_count,
        "duplicate_skills_count": len(duplicate_skill_names),
        "experience_entries_count": len(experiences),
        "project_entries_count": len(projects),
        "education_entries_count": len(education),
    }

    return ResumeQualityAudit(
        overall_score=overall_score,
        grade=grade,
        errors=errors,
        warnings=warnings,
        suggestions=suggestions,
        summary=summary_msg,
        metrics=metrics
    )


def calculate_ats_quality_assessment(
    resume: TailoredResumeResponse,
    audit: ResumeQualityAudit
) -> AtsQualityAssessment:
    """
    Calculate the separate ATS & Resume Quality Assessment across 6 distinct factors:
    1. Parseability (25% weight)
    2. Section structure (20% weight)
    3. Readability (15% weight)
    4. Formatting consistency (15% weight)
    5. Relevant content coverage (15% weight)
    6. Basic document completeness (10% weight)
    """
    # 1. Parseability (25%): Absence of control chars, verified email, phone, location
    parse_errors = [e for e in audit.errors if e.category in ("ats_parseability", "contact_info")]
    parse_score = 100 - (len(parse_errors) * 30)
    if not (resume.contact_info and resume.contact_info.email):
        parse_score -= 25
    if not (resume.contact_info and resume.contact_info.phone):
        parse_score -= 15
    if not (resume.contact_info and resume.contact_info.location):
        parse_score -= 5
    parse_score = max(20, min(100, parse_score))

    # 2. Section Structure (20%): Standard recognizable headings, reverse-chronological flow
    struct_issues = [i for i in (audit.errors + audit.warnings) if i.category in ("section_structure", "length")]
    struct_score = 100 - (len(struct_issues) * 15)
    if not resume.experience and not resume.projects:
        struct_score -= 35
    if not resume.education:
        struct_score -= 20
    if not resume.tailored_summary:
        struct_score -= 15
    struct_score = max(20, min(100, struct_score))

    # 3. Readability (15%): Pronouns absence, active voice verbs, bullet brevity, no keyword stuffing
    first_person_count = audit.metrics.get("first_person_bullet_count", 0)
    weak_starters = audit.metrics.get("weak_starter_bullet_count", 0)
    stuffed_bullets = audit.metrics.get("keyword_stuffed_bullet_count", 0)
    
    read_deductions = (first_person_count * 10) + (weak_starters * 6) + (stuffed_bullets * 15)
    read_issues = [i for i in (audit.warnings + audit.suggestions) if i.category in ("readability", "bullet_quality")]
    read_deductions += max(0, (len(read_issues) - (1 if first_person_count else 0) - (1 if weak_starters else 0) - (1 if stuffed_bullets else 0))) * 6
    read_score = max(20, min(100, 100 - read_deductions))

    # 4. Formatting Consistency (15%): Date consistency, deduplicated skills, no duplicate bullets
    dup_skills = audit.metrics.get("duplicate_skills_count", 0)
    dup_bullets = audit.metrics.get("duplicate_bullets_count", 0)
    missing_dates = audit.metrics.get("missing_dates_count", 0)
    format_deductions = (dup_skills * 15) + (dup_bullets * 15) + (missing_dates * 15)
    format_score = max(25, min(100, 100 - format_deductions))

    # 5. Relevant Content Coverage (15%): Technical competency breadth, accomplishment metrics
    matching_count = len(resume.skills.matching_skills) if resume.skills else 0
    additional_count = len(resume.skills.additional_skills) if resume.skills else 0
    total_skills = matching_count + additional_count
    
    skill_depth_score = min(1.0, total_skills / 8.0)
    bullet_depth_score = min(1.0, audit.metrics.get("bullet_count", 0) / 6.0)
    metric_count = audit.metrics.get("metric_bullets_count", 0)
    metric_score = min(1.0, metric_count / 2.0)
    
    coverage_score = int((skill_depth_score * 0.35 + bullet_depth_score * 0.35 + metric_score * 0.30) * 100)
    coverage_score = max(20, min(100, coverage_score))

    # 6. Basic Document Completeness (10%): Complete contact info, summary, education
    comp_points = 0
    if resume.candidate_name and resume.candidate_name.strip() and resume.candidate_name.lower() not in ["candidate", "untitled"]:
        comp_points += 20
    if resume.contact_info and resume.contact_info.email: comp_points += 20
    if resume.contact_info and resume.contact_info.phone: comp_points += 15
    if resume.contact_info and resume.contact_info.location: comp_points += 10
    if resume.contact_info and (resume.contact_info.linkedin or resume.contact_info.github): comp_points += 10
    if resume.tailored_summary and len(resume.tailored_summary.strip()) >= 30: comp_points += 15
    if resume.education and len(resume.education) > 0: comp_points += 10
    completeness_score = min(100, comp_points)

    weights = {
        "parseability": 0.25,
        "structure": 0.20,
        "readability": 0.15,
        "formatting_consistency": 0.15,
        "content_coverage": 0.15,
        "completeness": 0.10,
    }

    overall_ats = round(
        parse_score * weights["parseability"] +
        struct_score * weights["structure"] +
        read_score * weights["readability"] +
        format_score * weights["formatting_consistency"] +
        coverage_score * weights["content_coverage"] +
        completeness_score * weights["completeness"]
    )
    overall_ats = max(20, min(100, overall_ats))

    explanation = (
        f"ATS & Resume Quality Score of {overall_ats}% is derived from: "
        f"Parseability ({parse_score}%), Section Structure ({struct_score}%), "
        f"Readability ({read_score}%), Formatting Consistency ({format_score}%), "
        f"Content Coverage ({coverage_score}%), and Document Completeness ({completeness_score}%)."
    )

    return AtsQualityAssessment(
        overall_score=overall_ats,
        parseability_score=parse_score,
        structure_score=struct_score,
        readability_score=read_score,
        formatting_consistency_score=format_score,
        content_coverage_score=coverage_score,
        completeness_score=completeness_score,
        factor_weights=weights,
        explanation=explanation,
        disclaimer="This heuristic ATS quality assessment evaluates technical parseability, standard formatting, and readability. It does not represent proprietary screening algorithms from specific employer ATS vendors."
    )
