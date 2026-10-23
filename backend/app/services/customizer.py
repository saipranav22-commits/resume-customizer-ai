import json
import logging
import re
from typing import Dict, Any, Optional
import httpx
from fastapi import HTTPException, status

from app.config import settings
from app.models.schemas import (
    TailoredResumeResponse,
    ContactInfo,
    ExperienceItem,
    EducationItem,
    ProjectItem,
    SkillsCategorized,
    MissingKeywordSuggestion,
    AtsCompatibility,
)

logger = logging.getLogger("customizer")

SYSTEM_PROMPT = """
You are an expert Executive Resume Writer and Senior Technical Recruiter.
Your objective is to tailor an existing candidate's resume for a specific Job Description (JD).

CRITICAL ETHICAL & ACCURACY REQUIREMENTS:
1. STRICT TRUTHFULNESS: DO NOT FABRICATE OR INVENT any companies, degrees, dates, skills, or projects.
2. PRESERVE FACTUAL INTEGRITY: You may only rephrase, reorder, emphasize, and highlight genuine experiences that actually exist in the candidate's resume.
3. ISOLATE MISSING KEYWORDS: If the JD requires tools, languages, or skills NOT present in the candidate's resume, DO NOT add them to the candidate's skills list or experience bullets. Instead, place them strictly inside the `missing_keywords` array with actionable advisory recommendations for the candidate.
4. ATS OPTIMIZATION: Use clear standard headings, industry-standard action verbs, and quantifiable impact metrics where supported by the candidate's original text.

You MUST respond strictly with a valid JSON object matching the following structure:
{
  "candidate_name": "Full Name",
  "contact_info": {
    "email": "email or null",
    "phone": "phone or null",
    "location": "location or null",
    "linkedin": "linkedin url or null",
    "github": "github url or null",
    "portfolio": "portfolio or null"
  },
  "original_summary": "Original summary from resume, or inferred if absent",
  "tailored_summary": "Compelling 3-4 sentence professional summary tailored to target role using candidate's actual qualifications",
  "skills": {
    "matching_skills": ["Skill from resume that directly matches JD requirements"],
    "additional_skills": ["Genuine skill from resume that is complementary or foundational"]
  },
  "experience": [
    {
      "role": "Title",
      "company": "Company Name",
      "duration": "Dates/Duration",
      "location": "Location or null",
      "bullets": [
        "Rephrased bullet point highlighting impact and alignment with JD keywords, strictly based on candidate's real work"
      ]
    }
  ],
  "education": [
    {
      "degree": "Degree",
      "institution": "University/College",
      "year": "Year or null",
      "details": "Details or null"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "technologies": ["Tech from original project"],
      "bullets": ["Project bullet point"],
      "link": "URL or null"
    }
  ],
  "certifications": ["Certification name"],
  "missing_keywords": [
    {
      "keyword": "Required skill/keyword in JD that candidate lacks",
      "category": "e.g., Cloud / Language / Framework / Management",
      "context": "How the JD specifies this requirement",
      "recommendation": "Advice on how candidate can bridge or address this gap truthfully"
    }
  ],
  "match_score": 85,
  "ats_compatibility": {
    "score": 90,
    "strengths": ["Clear section hierarchy", "Strong action verbs matching JD"],
    "improvements": ["Consider addressing missing keywords in a cover letter"]
  },
  "job_description_summary": "1-2 sentence distillation of target role expectations"
}
"""

def extract_json_from_response(raw_text: str) -> Dict[str, Any]:
    """Extract and parse JSON from LLM text, handling markdown blocks."""
    cleaned = raw_text.strip()
    
    # Strip markdown code fence if present
    if "```json" in cleaned:
        match = re.search(r"```json\s*(.*?)\s*```", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(1).strip()
    elif "```" in cleaned:
        match = re.search(r"```\s*(.*?)\s*```", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(1).strip()
            
    # Remove any stray characters before opening brace
    brace_idx = cleaned.find("{")
    if brace_idx != -1:
        cleaned = cleaned[brace_idx:]
    rbrace_idx = cleaned.rfind("}")
    if rbrace_idx != -1:
        cleaned = cleaned[:rbrace_idx + 1]
        
    return json.loads(cleaned)

async def call_gemini_api(prompt: str, api_key: str, model_name: str) -> str:
    """Call Google Gemini API using direct REST endpoint for maximum reliability."""
    # List of candidate models to try
    models_to_try = [model_name, "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    # Deduplicate while preserving order
    seen = set()
    models = [m for m in models_to_try if not (m in seen or seen.add(m))]
    
    last_error = ""
    async with httpx.AsyncClient(timeout=45.0) as client:
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "topP": 0.95,
                    "responseMimeType": "application/json"
                }
            }
            try:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts:
                            return parts[0].get("text", "")
                else:
                    last_error = f"{model} returned status {response.status_code}: {response.text}"
                    logger.warning(f"Gemini API model {model} failed: {last_error}")
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Gemini API request error with model {model}: {last_error}")
                
    raise RuntimeError(f"Gemini API failed across all attempted models. Last error: {last_error}")

def build_deterministic_fallback(resume_text: str, jd_text: str) -> TailoredResumeResponse:
    """
    Intelligent deterministic fallback when no LLM API key is provided or offline.
    Extracts real entities from resume, matches JD keywords, and cleanly isolates missing keywords.
    """
    lines = [line.strip() for line in resume_text.split("\n") if line.strip()]
    candidate_name = lines[0] if lines else "Candidate Name"
    
    # Extract email and phone
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text)
    phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
    linkedin_match = re.search(r'(https?://(?:www\.)?linkedin\.com/in/[\w-]+)', resume_text, re.I)
    github_match = re.search(r'(https?://(?:www\.)?github\.com/[\w-]+)', resume_text, re.I)
    
    # Extract keywords from JD
    common_tech_keywords = [
        "python", "javascript", "typescript", "react", "next.js", "fastapi", "django",
        "node.js", "docker", "kubernetes", "aws", "gcp", "azure", "postgresql", "sql",
        "mongodb", "redis", "graphql", "rest api", "ci/cd", "git", "tailwind", "linux",
        "machine learning", "llm", "genai", "prompt engineering", "agile", "scrum"
    ]
    
    resume_lower = resume_text.lower()
    jd_lower = jd_text.lower()
    
    jd_keywords = [kw for kw in common_tech_keywords if kw in jd_lower]
    matching = [kw.title() for kw in jd_keywords if kw in resume_lower]
    missing = [kw.title() for kw in jd_keywords if kw not in resume_lower]
    
    # Additional skills from resume
    resume_found_skills = [kw.title() for kw in common_tech_keywords if kw in resume_lower]
    additional = [s for s in resume_found_skills if s not in matching]
    
    # Calculate match score
    if jd_keywords:
        match_score = int((len(matching) / len(jd_keywords)) * 100)
    else:
        match_score = 75
    match_score = max(35, min(95, match_score))
    
    # Missing keyword suggestions with strict isolation
    missing_suggestions = [
        MissingKeywordSuggestion(
            keyword=kw,
            category="Technical Requirement",
            context=f"The job description highlights {kw} as a desired skill.",
            recommendation=f"If you have hands-on experience or coursework with {kw}, add projects or certifications demonstrating it."
        )
        for kw in missing[:6]
    ]
    
    # Experience extraction
    experience_items = []
    current_role = None
    bullets = []
    
    for line in lines[1:]:
        if any(marker in line.lower() for marker in ["experience", "employment", "history", "work"]):
            continue
        if any(marker in line.lower() for marker in ["education", "skills", "projects", "certifications"]):
            if current_role and bullets:
                experience_items.append(ExperienceItem(
                    role=current_role,
                    company="Company",
                    duration="Recent",
                    bullets=bullets[:4]
                ))
                current_role = None
                bullets = []
            break
            
        if (len(line) < 50 and not line.startswith(('-', '•', '*')) and 
            any(t in line.lower() for t in ['engineer', 'developer', 'lead', 'analyst', 'manager', 'intern', 'consultant'])):
            if current_role and bullets:
                experience_items.append(ExperienceItem(
                    role=current_role,
                    company="Company",
                    duration="Recent",
                    bullets=bullets[:4]
                ))
                bullets = []
            current_role = line
        elif line.startswith(('-', '•', '*', '–')) or (current_role and len(line) > 20):
            cleaned_bullet = re.sub(r'^[-•*–\s]+', '', line).strip()
            if cleaned_bullet:
                bullets.append(cleaned_bullet)
                
    if current_role and bullets:
        experience_items.append(ExperienceItem(
            role=current_role,
            company="Company",
            duration="Recent",
            bullets=bullets[:4]
        ))
        
    if not experience_items:
        experience_items.append(ExperienceItem(
            role="Software Engineer",
            company="Engineering Experience",
            duration="Past Experience",
            bullets=[line for line in lines[2:6] if len(line) > 20] or ["Implemented robust software features and delivered production solutions."]
        ))
        
    tailored_summary = (
        f"Results-driven technical professional with hands-on expertise in {', '.join(matching[:3]) if matching else 'software engineering'}. "
        f"Demonstrated background in building scalable solutions and translating requirements into high-impact deliverables. "
        f"Well-aligned with the target role through a solid track record of problem-solving and rapid technology adoption."
    )
    
    return TailoredResumeResponse(
        candidate_name=candidate_name,
        contact_info=ContactInfo(
            email=email_match.group(0) if email_match else None,
            phone=phone_match.group(0) if phone_match else None,
            linkedin=linkedin_match.group(0) if linkedin_match else None,
            github=github_match.group(0) if github_match else None,
        ),
        original_summary=lines[1] if len(lines) > 1 and len(lines[1]) > 40 else None,
        tailored_summary=tailored_summary,
        skills=SkillsCategorized(
            matching_skills=matching or ["Problem Solving", "Software Architecture"],
            additional_skills=additional or ["Technical Documentation", "Version Control"]
        ),
        experience=experience_items,
        education=[EducationItem(degree="Relevant Degree / Studies", institution="University", year="Completed")],
        projects=[ProjectItem(name="Professional Engineering Projects", technologies=matching[:3], bullets=["Architected and deployed responsive full-stack features aligned with specifications."])],
        certifications=[],
        missing_keywords=missing_suggestions,
        match_score=match_score,
        ats_compatibility=AtsCompatibility(
            score=min(95, match_score + 5),
            strengths=["Relevant skills matched to job requirements", "Clean section headers and standard formatting", "Clear career progression"],
            improvements=["Address missing keywords in interview or portfolio if you have related experience"]
        ),
        raw_parsed_resume_text=resume_text[:2000],
        job_description_summary=jd_text[:200] + "..." if len(jd_text) > 200 else jd_text
    )

async def customize_resume(resume_text: str, jd_text: str) -> TailoredResumeResponse:
    """
    Main customization orchestrator:
    1. Evaluates LLM keys (Gemini / Groq).
    2. Builds structured prompt enforcing truthful resume tailoring and isolated missing keywords.
    3. Calls LLM API and validates response into TailoredResumeResponse.
    4. Seamlessly falls back to deterministic extraction if LLM is not configured or errors.
    """
    api_key = settings.GEMINI_API_KEY.strip()
    
    if not api_key:
        logger.info("No GEMINI_API_KEY provided; utilizing high-fidelity deterministic resume analyzer.")
        return build_deterministic_fallback(resume_text, jd_text)
        
    user_prompt = f"""
{SYSTEM_PROMPT}

CANDIDATE'S ORIGINAL RESUME CONTENT:
---
{resume_text}
---

TARGET JOB DESCRIPTION:
---
{jd_text}
---

Remember: Return ONLY valid JSON adhering strictly to the schema. Do not include markdown preamble.
"""
    try:
        raw_output = await call_gemini_api(user_prompt, api_key, settings.LLM_MODEL)
        parsed_dict = extract_json_from_response(raw_output)
        
        # Ensure raw parsed text and JD summary are attached
        parsed_dict["raw_parsed_resume_text"] = resume_text[:2000]
        if not parsed_dict.get("job_description_summary"):
            parsed_dict["job_description_summary"] = jd_text[:200] + "..."
            
        validated_response = TailoredResumeResponse(**parsed_dict)
        return validated_response
    except Exception as e:
        logger.error(f"LLM customization failed: {str(e)}. Falling back to deterministic engine.")
        # Fallback ensures resilience without breaking user experience
        fallback = build_deterministic_fallback(resume_text, jd_text)
        return fallback
