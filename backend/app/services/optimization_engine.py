import logging
import re
from typing import Dict, Any, Optional, List, Set

from app.models.schemas import (
    JobDescriptionAnalysis,
    MatchScoreBreakdown,
    OptimizationRecommendation,
    MissingKeywordSuggestion,
)

logger = logging.getLogger("optimization_engine")

COMMON_TECH_SKILLS = [
    "python", "javascript", "typescript", "react", "next.js", "vue", "angular",
    "fastapi", "django", "flask", "node.js", "express", "go", "golang", "rust", "java", "spring",
    "docker", "kubernetes", "k8s", "aws", "gcp", "azure", "postgresql", "postgres", "sql", "mysql",
    "mongodb", "redis", "graphql", "rest api", "ci/cd", "git", "github", "gitlab",
    "tailwind", "css", "html", "linux", "terraform", "helm", "kafka", "rabbitmq",
    "machine learning", "deep learning", "llm", "genai", "nlp", "pytorch", "tensorflow",
    "agile", "scrum", "microservices", "system design", "distributed systems"
]

def sanitize_untrusted_input(text: str) -> str:
    """Sanitize untrusted resume and JD inputs against prompt injection and delimiter manipulation."""
    if not text:
        return ""
    injection_patterns = [
        r'(?i)(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules|commands)',
        r'(?i)(you\s+are\s+now|act\s+as\s+an?|pretend\s+to\s+be)\s+([a-z0-9_-]+)',
        r'(?i)system\s*:\s*',
        r'(?i)assistant\s*:\s*',
        r'(?i)human\s*:\s*',
        r'(?i)prompt\s*injection',
    ]
    cleaned = text
    for pattern in injection_patterns:
        cleaned = re.sub(pattern, "[FILTERED_INSTRUCTION]", cleaned)
    cleaned = re.sub(r'```+', '`', cleaned)
    return cleaned.strip()

def analyze_job_description_deterministic(jd_text: str) -> JobDescriptionAnalysis:
    """Deterministic structured extraction of requirements, skills, tools, and responsibilities from a JD."""
    lines = [l.strip() for l in jd_text.splitlines() if l.strip()]
    jd_lower = jd_text.lower()

    # 1. Target role extraction
    target_role = None
    role_patterns = [
        r'(?i)(?:job\s+title|role|position)\s*:\s*([^\n\r]+)',
        r'(?i)(?:looking\s+for|seeking|hiring)\s+(?:an?|our\s+next)?\s+([A-Za-z0-9\s/-]+?\b(?:engineer|developer|architect|lead|manager|analyst|specialist|consultant)\b)',
        r'(?i)^([A-Za-z0-9\s/-]+(?:engineer|developer|architect|lead|manager|analyst|specialist|consultant))\b'
    ]
    for p in role_patterns:
        m = re.search(p, jd_text)
        if m:
            clean_role = m.group(1).strip(" -:?|")
            clean_role = re.sub(r'^(?:looking\s+for|seeking|hiring|we\s+are\s+looking\s+for)\s+(?:an?|our\s+next)?\s*', '', clean_role, flags=re.I)
            clean_role = re.sub(r'^(?:experienced|talented|passionate|exceptional)\s+', '', clean_role, flags=re.I)
            if 3 <= len(clean_role) <= 60:
                target_role = clean_role
                break
    if not target_role:
        for line in lines[:8]:
            if any(k in line.lower() for k in ['engineer', 'developer', 'architect', 'lead', 'manager']) and len(line) < 60:
                target_role = line.strip(" -:?|#*")
                break
    if not target_role:
        target_role = "Software Engineer"

    # 2. Section segmentation: detect Required vs Preferred vs Responsibilities
    required_text_chunks = []
    preferred_text_chunks = []
    resp_text_chunks = []
    current_section = "general"

    req_headers = ["requirements", "required", "qualifications", "must have", "what you bring", "minimum qualifications", "who you are"]
    pref_headers = ["preferred", "nice to have", "bonus", "desired", "plus", "preferred qualifications", "additional qualifications"]
    resp_headers = ["responsibilities", "what you'll do", "what you will do", "the role", "duties", "key responsibilities"]

    for line in lines:
        lower_line = line.lower().strip(" #*:-_")
        if any(h in lower_line for h in pref_headers) and len(lower_line) < 40:
            current_section = "preferred"
            continue
        elif any(h in lower_line for h in req_headers) and len(lower_line) < 40:
            current_section = "required"
            continue
        elif any(h in lower_line for h in resp_headers) and len(lower_line) < 40:
            current_section = "responsibilities"
            continue
        elif len(lower_line) < 30 and lower_line.endswith(":") and not any(k in lower_line for k in ["about", "benefit", "perk"]):
            current_section = "other"

        if current_section == "required":
            required_text_chunks.append(line)
        elif current_section == "preferred":
            preferred_text_chunks.append(line)
        elif current_section == "responsibilities":
            resp_text_chunks.append(line)

    req_blob = " ".join(required_text_chunks).lower()
    pref_blob = " ".join(preferred_text_chunks).lower()

    # 3. Categorize skills
    all_found_skills = [kw for kw in COMMON_TECH_SKILLS if re.search(r'\b' + re.escape(kw) + r'\b', jd_lower)]
    required_skills = []
    preferred_skills = []

    for skill in all_found_skills:
        skill_name = skill.title() if len(skill) > 3 and skill not in ["aws", "gcp", "sql", "k8s", "llm", "nlp", "ci/cd"] else skill.upper()
        if pref_blob and re.search(r'\b' + re.escape(skill) + r'\b', pref_blob):
            preferred_skills.append(skill_name)
        elif req_blob and re.search(r'\b' + re.escape(skill) + r'\b', req_blob):
            required_skills.append(skill_name)
        else:
            context_match = re.search(r'([^\.\n]*\b' + re.escape(skill) + r'\b[^\.\n]*)', jd_lower)
            if context_match:
                sentence = context_match.group(1)
                if any(w in sentence for w in ["plus", "bonus", "preferred", "nice to have", "ideally"]):
                    preferred_skills.append(skill_name)
                else:
                    required_skills.append(skill_name)
            else:
                required_skills.append(skill_name)

    # 4. Tools and Frameworks
    tool_keywords = ["docker", "kubernetes", "aws", "gcp", "azure", "postgresql", "redis", "graphql", "terraform", "git", "linux", "ci/cd", "fastapi", "react", "next.js", "django"]
    tools_frameworks = [s for s in (required_skills + preferred_skills) if s.lower() in tool_keywords]

    # 5. Experience and Education
    exp_match = re.search(r'(?i)(\d+\+?\s*(?:-\s*\d+)?\s*(?:years?|yrs?)(?:\s*of)?\s*(?:experience|exp)?)', jd_text)
    experience_level = exp_match.group(1).strip() if exp_match else None
    if not experience_level:
        if "senior" in jd_lower:
            experience_level = "5+ years (Senior)"
        elif "lead" in jd_lower:
            experience_level = "7+ years (Lead)"
        elif "junior" in jd_lower or "entry" in jd_lower:
            experience_level = "0-2 years (Junior)"
        else:
            experience_level = "3+ years (Mid-Senior)"

    edu_match = re.search(r'(?i)\b(bachelor\'?s?|master\'?s?|ph\.?d\.?|b\.?s\.?|computer science degree|equivalent practical experience[^\.\n]*)\b', jd_text)
    education_requirement = edu_match.group(1).strip() if edu_match else "Bachelor's degree in Computer Science, STEM, or equivalent practical experience"

    # 6. Responsibilities
    responsibilities = []
    for line in resp_text_chunks:
        cleaned_bullet = re.sub(r'^[-?*?\s]+', '', line).strip()
        if len(cleaned_bullet) > 15:
            responsibilities.append(cleaned_bullet)
    if not responsibilities:
        responsibilities = [
            f"Architect, develop, and maintain robust production services as a {target_role}.",
            "Collaborate cross-functionally with product, engineering, and infrastructure stakeholders.",
            "Write clean, testable, and maintainable code adhering to industry best practices."
        ]

    return JobDescriptionAnalysis(
        target_role=target_role,
        required_skills=required_skills[:12],
        preferred_skills=preferred_skills[:8],
        tools_frameworks=tools_frameworks[:10],
        experience_level=experience_level,
        education_requirement=education_requirement,
        responsibilities=responsibilities[:6],
        keywords=list(set(all_found_skills))[:15]
    )

def calculate_explainable_match(
    resume_text: str,
    jd_analysis: JobDescriptionAnalysis,
    grounded_skills: Optional[List[str]] = None
) -> MatchScoreBreakdown:
    """
    Transparent scoring breakdown using clearly defined, tested factor weights:
    - Required skill coverage: 35%
    - Preferred skill coverage: 15% (redistributed to required if none specified)
    - Experience alignment: 20%
    - Responsibility alignment: 15%
    - Keyword coverage: 10%
    - Resume structure: 5%
    Includes missing-data handling and an ethical non-guarantee disclaimer.
    """
    resume_lower = resume_text.lower()
    grounded_skills_lower = [s.lower() for s in (grounded_skills or [])]

    req_skills = jd_analysis.required_skills
    pref_skills = jd_analysis.preferred_skills
    responsibilities = jd_analysis.responsibilities
    keywords = jd_analysis.keywords

    # 1. Required skills score (0-100)
    if req_skills:
        matched_req = [s for s in req_skills if s.lower() in resume_lower or s.lower() in grounded_skills_lower]
        req_score = int((len(matched_req) / len(req_skills)) * 100)
    else:
        matched_req = []
        req_score = 85

    # 2. Preferred skills score (0-100)
    if pref_skills:
        matched_pref = [s for s in pref_skills if s.lower() in resume_lower or s.lower() in grounded_skills_lower]
        pref_score = int((len(matched_pref) / len(pref_skills)) * 100)
    else:
        matched_pref = []
        pref_score = 100

    # 3. Experience score (0-100)
    target_role = (jd_analysis.target_role or "").lower()
    role_tokens = [t for t in target_role.split() if len(t) > 3 and t not in ["senior", "lead", "junior", "staff", "role", "engineer", "developer"]]
    role_alignment = sum(1 for t in role_tokens if t in resume_lower) / max(1, len(role_tokens))
    
    bullet_count = len(re.findall(r'(?m)^[-?*?\s]+', resume_text))
    bullet_depth_score = min(1.0, bullet_count / 8.0)
    
    has_seniority_gap = ("senior" in target_role or "lead" in target_role) and not any(k in resume_lower for k in ["senior", "lead", "years", "architect", "scale", "managed"])
    seniority_factor = 0.75 if has_seniority_gap else 1.0
    
    exp_score = int(((role_alignment * 0.45) + (bullet_depth_score * 0.35) + (seniority_factor * 0.20)) * 100)
    exp_score = max(40, min(100, exp_score))

    # 4. Responsibility alignment (0-100)
    action_verbs = ["built", "designed", "implemented", "optimized", "architected", "developed", "led", "managed", "deployed", "scaled"]
    verbs_in_resume = sum(1 for v in action_verbs if v in resume_lower)
    verb_score = min(1.0, verbs_in_resume / 5.0)
    
    resp_overlap = 0
    if responsibilities:
        for resp in responsibilities:
            words = [w.lower() for w in re.findall(r'\b[A-Za-z]{4,}\b', resp) if w.lower() not in ["with", "from", "that", "this", "will", "your", "team", "using", "work"]]
            if any(w in resume_lower for w in words):
                resp_overlap += 1
        resp_alignment = resp_overlap / len(responsibilities)
    else:
        resp_alignment = 0.8
    resp_score = int(((resp_alignment * 0.65) + (verb_score * 0.35)) * 100)
    resp_score = max(35, min(100, resp_score))

    # 5. Keyword coverage (0-100)
    if keywords:
        matched_kw = [k for k in keywords if k.lower() in resume_lower]
        kw_score = int((len(matched_kw) / len(keywords)) * 100)
    else:
        kw_score = 80

    # 6. Structure score (0-100)
    sections = ["experience", "education", "skills", "projects", "summary"]
    matched_sections = [s for s in sections if s in resume_lower]
    has_contact = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text))
    struct_score = int(((len(matched_sections) / len(sections)) * 0.8 + (0.2 if has_contact else 0.0)) * 100)

    # Missing-data handling: redistribute preferred weight if none specified
    if not pref_skills:
        weights = {
            "required_skills": 0.50,
            "preferred_skills": 0.00,
            "experience": 0.20,
            "responsibilities": 0.15,
            "keyword_coverage": 0.10,
            "structure": 0.05
        }
    else:
        weights = {
            "required_skills": 0.35,
            "preferred_skills": 0.15,
            "experience": 0.20,
            "responsibilities": 0.15,
            "keyword_coverage": 0.10,
            "structure": 0.05
        }

    overall = round(
        req_score * weights["required_skills"] +
        pref_score * weights["preferred_skills"] +
        exp_score * weights["experience"] +
        resp_score * weights["responsibilities"] +
        kw_score * weights["keyword_coverage"] +
        struct_score * weights["structure"]
    )
    overall = max(20, min(98, overall))

    explanation = (
        f"Overall match score of {overall}% is computed from: "
        f"Required skills coverage ({req_score}% across {len(matched_req)}/{len(req_skills) if req_skills else 1} criteria), "
        f"Preferred skills coverage ({pref_score}%), "
        f"Role & experience alignment ({exp_score}%), "
        f"Responsibility alignment ({resp_score}%), "
        f"Domain keyword coverage ({kw_score}%), and "
        f"Resume format & structural readability ({struct_score}%)."
    )

    return MatchScoreBreakdown(
        overall_score=overall,
        required_skill_score=req_score,
        preferred_skill_score=pref_score,
        experience_score=exp_score,
        responsibility_score=resp_score,
        keyword_score=kw_score,
        structure_score=struct_score,
        factor_weights=weights,
        explanation=explanation,
        disclaimer="Match scores indicate semantic and structural alignment with the provided job description. They do not simulate or guarantee proprietary ATS screening decisions or employer interview outcomes."
    )

def generate_optimization_recommendations(
    resume_text: str,
    jd_analysis: JobDescriptionAnalysis,
    grounded_matching_skills: List[str],
    missing_keywords: List[MissingKeywordSuggestion]
) -> List[OptimizationRecommendation]:
    """Generate prioritized, evidence-grounded recommendations with explicit confirmation flags."""
    recommendations: List[OptimizationRecommendation] = []
    resume_lower = resume_text.lower()
    grounded_lower = [s.lower() for s in grounded_matching_skills]

    # 1. Missing required skills (High priority, requires confirmation)
    for skill in jd_analysis.required_skills:
        if skill.lower() not in resume_lower and skill.lower() not in grounded_lower:
            recommendations.append(OptimizationRecommendation(
                issue=f"Required skill '{skill}' is absent from resume text.",
                requirement=f"Job description specifies '{skill}' as a mandatory qualification.",
                evidence=f"No verified mention of '{skill}' in parsed resume or project descriptions.",
                proposed_improvement=f"If you have academic or practical experience with {skill}, add a truthful project bullet or coursework reference.",
                priority="high",
                requires_user_confirmation=True
            ))

    # 2. Missing preferred skills (Medium priority, requires confirmation)
    req_skills_lower = [s.lower() for s in jd_analysis.required_skills]
    for skill in jd_analysis.preferred_skills:
        if skill.lower() in req_skills_lower:
            continue
        if skill.lower() not in resume_lower and skill.lower() not in grounded_lower:
            recommendations.append(OptimizationRecommendation(
                issue=f"Preferred skill '{skill}' not highlighted.",
                requirement=f"Job description lists '{skill}' as a bonus or nice-to-have qualification.",
                evidence=f"'{skill}' not detected in resume text.",
                proposed_improvement=f"Highlight any relevant exposure to {skill} in your technical profile or cover letter.",
                priority="medium",
                requires_user_confirmation=True
            ))

    # 3. Quantifiable impact check (Medium priority, requires confirmation)
    has_metrics = len(re.findall(r'\b\d+(?:\.\d+)?%|\b\$\d+|\b\d+\s*(?:ms|k|m|million|users|req/s)\b', resume_lower)) >= 2
    if not has_metrics:
        recommendations.append(OptimizationRecommendation(
            issue="Experience bullet points lack quantifiable impact metrics.",
            requirement="Recruiters and hiring managers prioritize measurable achievements (e.g., performance gains, scale).",
            evidence="Fewer than 2 bullet points in the resume contain verified numerical impact.",
            proposed_improvement="Add candidate-confirmed metrics (such as % latency reduction or throughput scale) to past project bullets.",
            priority="medium",
            requires_user_confirmation=True
        ))

    # 4. Target role summary alignment (Low priority, evidence grounded)
    target_role = jd_analysis.target_role or "Software Engineer"
    if target_role.lower() not in resume_lower:
        recommendations.append(OptimizationRecommendation(
            issue="Resume summary does not explicitly target the candidate's focus role.",
            requirement=f"Recruiters look for immediate alignment with the '{target_role}' title.",
            evidence=f"Opening summary does not mention '{target_role}'.",
            proposed_improvement=f"Rephrase the professional summary to highlight core capabilities relevant to {target_role}.",
            priority="low",
            requires_user_confirmation=False
        ))

    return recommendations[:8]

def validate_and_normalize_ai_output(
    parsed_dict: Dict[str, Any],
    resume_text: str,
    jd_text: str
) -> Dict[str, Any]:
    """
    Validate LLM JSON output to enforce:
    1. Anti-hallucination: Remove skills from matching_skills if no evidence exists in resume_text.
    2. Convert ungrounded claims into recommendations requiring candidate confirmation.
    3. Ensure structured JobDescriptionAnalysis and MatchScoreBreakdown are populated and mathematically sound.
    """
    resume_lower = resume_text.lower()
    
    # Extract skills
    skills_dict = parsed_dict.get("skills", {})
    raw_matching = skills_dict.get("matching_skills", [])
    raw_additional = skills_dict.get("additional_skills", [])
    
    grounded_matching = []
    ungrounded_skills = []
    
    for skill in raw_matching:
        skill_str = str(skill).strip()
        tokens = [t.lower() for t in re.split(r'[\s/-]+', skill_str) if len(t) > 2]
        if skill_str.lower() in resume_lower or any(t in resume_lower for t in tokens):
            grounded_matching.append(skill_str)
        else:
            ungrounded_skills.append(skill_str)
            logger.info(f"Anti-hallucination guard removed ungrounded skill '{skill_str}' from matching skills.")

    skills_dict["matching_skills"] = grounded_matching
    skills_dict["additional_skills"] = raw_additional
    parsed_dict["skills"] = skills_dict

    # Job description analysis
    raw_analysis = parsed_dict.get("job_analysis")
    if not isinstance(raw_analysis, dict) or not raw_analysis.get("required_skills"):
        jd_analysis = analyze_job_description_deterministic(jd_text)
        parsed_dict["job_analysis"] = jd_analysis.model_dump()
    else:
        try:
            jd_analysis = JobDescriptionAnalysis(**raw_analysis)
        except Exception:
            jd_analysis = analyze_job_description_deterministic(jd_text)
            parsed_dict["job_analysis"] = jd_analysis.model_dump()

    # Match score breakdown calculation
    breakdown = calculate_explainable_match(resume_text, jd_analysis, grounded_matching)
    parsed_dict["match_breakdown"] = breakdown.model_dump()
    parsed_dict["match_score"] = breakdown.overall_score

    # Recommendations
    raw_recs = parsed_dict.get("recommendations", [])
    valid_recs = []
    if isinstance(raw_recs, list):
        for r in raw_recs:
            if isinstance(r, dict) and "issue" in r and "proposed_improvement" in r:
                valid_recs.append(r)
                
    # Add ungrounded skills as recommendations requiring confirmation
    for ungrounded in ungrounded_skills:
        valid_recs.insert(0, {
            "issue": f"Ungrounded claim: '{ungrounded}' was suggested by AI but not verified in resume.",
            "requirement": f"Job description emphasizes '{ungrounded}'.",
            "evidence": f"No mention of '{ungrounded}' found in uploaded resume.",
            "proposed_improvement": f"Confirm if you have authentic experience with {ungrounded} before adding it to your resume.",
            "priority": "high",
            "requires_user_confirmation": True
        })

    # If recommendations are few, supplement deterministically
    if len(valid_recs) < 3:
        det_recs = generate_optimization_recommendations(
            resume_text,
            jd_analysis,
            grounded_matching,
            []
        )
        for dr in det_recs:
            if not any(vr.get("issue") == dr.issue for vr in valid_recs):
                valid_recs.append(dr.model_dump())

    parsed_dict["recommendations"] = valid_recs[:8]

    # ATS compatibility
    ats_dict = parsed_dict.get("ats_compatibility")
    if not isinstance(ats_dict, dict) or "score" not in ats_dict:
        parsed_dict["ats_compatibility"] = {
            "score": min(95, breakdown.overall_score + 5),
            "strengths": ["Clear standard headings", "Industry-standard action verbs", "Grounded skill alignment"],
            "improvements": ["Review flagged recommendations requiring user confirmation"]
        }

    return parsed_dict
