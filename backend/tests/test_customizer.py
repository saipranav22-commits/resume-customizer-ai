import json
from app.services.customizer import extract_json_from_response, build_deterministic_fallback

def test_extract_json_with_markdown_fence():
    sample_json = {"candidate_name": "Test User", "match_score": 90}
    raw_markdown = f"Here is the result:\n```json\n{json.dumps(sample_json)}\n```\nHope this helps!"
    parsed = extract_json_from_response(raw_markdown)
    assert parsed["candidate_name"] == "Test User"
    assert parsed["match_score"] == 90

def test_deterministic_fallback_preserves_factual_integrity():
    resume_text = """
    Samantha Ray
    samantha@example.com | 555-0123
    Software Engineer with 3 years building web apps.
    Experience:
    Frontend Developer at WebCorp
    - Built responsive React dashboards using TypeScript
    - Created internal REST API clients
    Skills: React, TypeScript, JavaScript, Git
    """
    
    # JD requires Python, Docker, Kubernetes, and AWS (which candidate lacks)
    jd_text = """
    Looking for a Full Stack Engineer who knows React, TypeScript, Python, Docker, and Kubernetes.
    Must have experience deploying cloud infrastructure on AWS.
    """
    
    result = build_deterministic_fallback(resume_text, jd_text)
    
    # Factual skills present in resume
    assert "React" in result.skills.matching_skills or "Typescript" in result.skills.matching_skills
    
    # Missing keywords must be in missing_keywords, NOT matching_skills
    missing_kw_names = [m.keyword.lower() for m in result.missing_keywords]
    assert any("docker" in k or "kubernetes" in k or "python" in k or "aws" in k for k in missing_kw_names)
    
    # Ensure missing keywords are strictly isolated from matching_skills
    matching_lower = [s.lower() for s in result.skills.matching_skills]
    for m_kw in missing_kw_names:
        assert m_kw not in matching_lower, f"Missing keyword '{m_kw}' was improperly injected into matching skills!"
