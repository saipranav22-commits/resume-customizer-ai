import pytest
from app.services.optimization_engine import (
    analyze_job_description_deterministic,
    calculate_explainable_match
)
from app.services.audit import (
    audit_resume_quality,
    calculate_ats_quality_assessment
)
from app.services.customizer import build_deterministic_fallback, recheck_draft_score

SAMPLE_CALIBRATION_JD = """Job Title: Senior Backend Engineer
Company: CloudScale Systems
Location: San Francisco, CA (Remote)

About the Role:
We are looking for a Senior Backend Engineer to design, build, and scale our high-throughput distributed microservices.

Requirements:
- 5+ years of production experience in Python and backend development
- Extensive hands-on experience with FastAPI or modern Python web frameworks
- Strong proficiency with PostgreSQL, schema design, and query optimization
- Production experience with Docker and AWS cloud infrastructure

Preferred Qualifications:
- Experience with Redis caching and distributed task queues
- Experience with Kubernetes (k8s) and modern CI/CD pipelines
- Proven ability to mentor junior engineers and conduct rigorous code reviews

Responsibilities:
- Architect and deploy scalable microservices capable of handling millions of requests per day
- Optimize PostgreSQL database queries, indexes, and connection pooling for maximum throughput
- Collaborate with infrastructure teams to maintain containerized Docker and AWS deployments
- Champion code quality, write automated tests, and mentor engineering peers
"""

EXCELLENT_MATCH_RESUME = """Alex Morgan
alex.morgan@example.com | (555) 019-2834 | Seattle, WA | linkedin.com/in/alexmorgan | github.com/alexmorgan

Professional Summary:
Senior Backend Engineer with 6+ years of specialized experience architecting scalable distributed systems using Python and FastAPI. Proven track record of optimizing PostgreSQL query throughput by 42% and orchestrating production deployments across AWS and Docker. Dedicated to automated testing and technical mentorship.

Core Technical Skills:
Python, FastAPI, PostgreSQL, Docker, AWS, Redis, Kubernetes, CI/CD, Microservices, Git, Linux, Unit Testing

Professional Experience:
Senior Software Engineer | NexaCloud Inc. | 2021 - Present
- Architected and deployed 14 high-throughput microservices using Python and FastAPI handling 15M daily API calls with 99.98% uptime.
- Optimized PostgreSQL database access patterns and query indexing, reducing p99 latency from 320ms to 85ms across core transaction tables.
- Containerized development and staging pipelines using Docker and AWS ECS, accelerating deployment velocity by 3.5x.
- Mentored 4 junior backend engineers through structured code reviews and technical design doc walkthroughs.

Backend Developer | Apex Data Labs | 2018 - 2021
- Developed RESTful API endpoints and background processing queues in Python and Redis for real-time analytics data ingestion.
- Implemented automated CI/CD workflows and unit test suites achieving 92% code coverage across all core backend services.
- Collaborated cross-functionally with product and frontend engineering to deliver complex customer data export features.

Education:
Bachelor of Science in Computer Science | University of Washington | 2014 - 2018
"""

UNRELATED_CHEF_RESUME = """Jordan Bell
jordan.bell@culinaryexample.com | (555) 349-8821 | Portland, OR | linkedin.com/in/jordanbellchef

Professional Summary:
Executive Head Chef with 8+ years of high-volume kitchen leadership, culinary innovation, and restaurant operations management. Expert in menu engineering, farm-to-table sourcing, team mentorship, and strict food safety compliance. Consistently maintained 28% food cost targets while increasing dining room revenue by 35%.

Core Skills:
Culinary Management, Menu Engineering, Food Cost Control, Staff Leadership, Farm-to-Table Sourcing, HACCP Food Safety, Kitchen Inventory, Recipe Development, Banquet Catering

Professional Experience:
Executive Chef | Bistro Moderne | 2020 - Present
- Directed all daily kitchen operations and managed a 22-person culinary team for an acclaimed 180-seat fine dining establishment.
- Developed seasonal tasting menus that increased dinner guest average spend by 22% and secured regional culinary awards.
- Controlled food and labor costs to maintain operating margins within 1.5% of annual financial projections.
- Trained and mentored line cooks and sous chefs in sanitation standards, knife skills, and inventory management.

Sous Chef | Hearth & Vine | 2017 - 2020
- Supervised banquet food preparation and line execution for high-volume corporate events and private dinner services.
- Managed vendor relationships and negotiated wholesale contracts with local agricultural suppliers, reducing produce costs by 12%.

Education:
Associate Degree in Culinary Arts | Culinary Institute of America | 2015 - 2017
"""

POOR_FORMAT_RESUME = """Sam Taylor
sam.taylor@example.com

Summary:
I am a software engineer and I worked with python for many years. My skills are python, fastapi, postgresql, docker, aws, redis.

Experience:
Software Engineer at TechWorks
- Responsible for writing python code and fastapi backend services for our website.
- I helped with postgresql database tuning and I handled docker containers on aws.
- Worked on redis caching when we had performance issues.
- Duties included fixing bugs and participating in meetings with my manager and team.

Education:
BS Computer Science
"""

INCOMPLETE_RESUME = """Casey Rivera
Candidate

Experience:
Developer
- Wrote software features.
"""

KEYWORD_STUFFED_RESUME = """Morgan Lee
morgan.lee@example.com | (555) 782-9901 | Remote

Summary:
Python Python Python FastAPI FastAPI Docker Docker PostgreSQL PostgreSQL AWS AWS Kubernetes CI/CD Redis microservices backend engineer.

Skills:
Python, FastAPI, Docker, PostgreSQL, AWS, Redis, Kubernetes, CI/CD, Microservices, Python, FastAPI, Docker, PostgreSQL

Experience:
Engineer | TechCorp | 2020 - Present
- Python FastAPI Docker PostgreSQL AWS Redis Kubernetes CI/CD.
- Python FastAPI Docker PostgreSQL AWS Redis Kubernetes CI/CD.
- Python FastAPI Docker PostgreSQL AWS Redis Kubernetes CI/CD.
- Python FastAPI Docker PostgreSQL AWS Redis Kubernetes CI/CD.
"""

def test_controlled_calibration_dataset_discrimination():
    """Verify that the calibrated engine cleanly discriminates across the 5 benchmark profiles."""
    jd_analysis = analyze_job_description_deterministic(SAMPLE_CALIBRATION_JD)
    
    # 1. Excellent Genuine Match
    resp1 = build_deterministic_fallback(EXCELLENT_MATCH_RESUME, SAMPLE_CALIBRATION_JD)
    assert resp1.match_score >= 88, f"Expected high match score, got {resp1.match_score}"
    assert resp1.match_breakdown.required_skill_score == 100
    assert resp1.match_breakdown.experience_score >= 90
    assert resp1.match_breakdown.responsibility_score >= 80
    assert resp1.ats_quality_assessment.overall_score >= 80

    # 2. Unrelated Resume (Executive Chef)
    resp2 = build_deterministic_fallback(UNRELATED_CHEF_RESUME, SAMPLE_CALIBRATION_JD)
    # Match score must be low (< 15%) because candidate has zero software skills or engineering background
    assert resp2.match_score <= 15, f"Unrelated resume match score must be low, got {resp2.match_score}"
    assert resp2.match_breakdown.required_skill_score == 0
    assert resp2.match_breakdown.experience_score <= 10, f"Unrelated experience score must be <= 10, got {resp2.match_breakdown.experience_score}"
    assert resp2.match_breakdown.responsibility_score <= 15, f"Unrelated responsibility score must be <= 15, got {resp2.match_breakdown.responsibility_score}"
    # ATS Quality remains high (> 75%) because chef resume is cleanly formatted (metrics, dates, sections)
    assert resp2.ats_quality_assessment.overall_score >= 75

    # 3. Strong Match with Poor Formatting
    resp3 = build_deterministic_fallback(POOR_FORMAT_RESUME, SAMPLE_CALIBRATION_JD)
    assert 45 <= resp3.match_score <= 70
    # Readability and completeness suffer due to missing phone, location, and first-person phrasing
    assert resp3.ats_quality_assessment.overall_score <= 82
    assert resp3.ats_quality_assessment.completeness_score <= 70

    # 4. Incomplete Resume
    resp4 = build_deterministic_fallback(INCOMPLETE_RESUME, SAMPLE_CALIBRATION_JD)
    assert resp4.match_score <= 10, f"Incomplete resume match score must be <= 10, got {resp4.match_score}"
    assert resp4.ats_quality_assessment.overall_score <= 65, f"Incomplete resume ATS quality must be <= 65, got {resp4.ats_quality_assessment.overall_score}"
    assert resp4.ats_quality_assessment.completeness_score <= 50

    # 5. Keyword-Stuffed Resume
    resp5 = build_deterministic_fallback(KEYWORD_STUFFED_RESUME, SAMPLE_CALIBRATION_JD)
    # Responsibility alignment must not be granted for mere keyword dumps
    assert resp5.match_breakdown.responsibility_score <= 25, f"Keyword-stuffed responsibility score must be <= 25, got {resp5.match_breakdown.responsibility_score}"
    assert resp5.ats_quality_assessment.readability_score <= 75, f"Keyword-stuffed readability score must be <= 75, got {resp5.ats_quality_assessment.readability_score}"

def test_missing_required_skills_reduce_job_match():
    """Verify that omitting required skills directly reduces match score proportionally."""
    jd_analysis = analyze_job_description_deterministic(SAMPLE_CALIBRATION_JD)
    
    # Resume with all required skills
    full_text = "Senior Engineer with Python, FastAPI, Docker, AWS, PostgreSQL, and Microservices experience."
    mb_full = calculate_explainable_match(full_text, jd_analysis, ["Python", "FastAPI", "Docker", "AWS", "PostgreSQL", "Microservices"])
    
    # Resume with only 2 out of 6 required skills
    partial_text = "Junior Developer with Python and Docker experience."
    mb_partial = calculate_explainable_match(partial_text, jd_analysis, ["Python", "Docker"])
    
    assert mb_full.required_skill_score > mb_partial.required_skill_score
    assert mb_full.overall_score > mb_partial.overall_score
    assert mb_partial.required_skill_score == int((2 / 6) * 100)

def test_no_preferred_skills_does_not_falsely_report_100_percent():
    """When a JD lacks preferred skills, preferred_skill_score is 0 (with 0% weight), not a false 100%."""
    jd_text = """Job Title: Backend Developer
Requirements:
- Python
- PostgreSQL
"""
    jd_analysis = analyze_job_description_deterministic(jd_text)
    assert len(jd_analysis.preferred_skills) == 0
    
    resume_text = "Developer with Python and PostgreSQL experience."
    mb = calculate_explainable_match(resume_text, jd_analysis, ["Python", "PostgreSQL"])
    
    # Weight must be redistributed to required_skills (50%)
    assert mb.factor_weights["preferred_skills"] == 0.00
    assert mb.factor_weights["required_skills"] == 0.50
    # Preferred score should be 0, not a misleading 100%
    assert mb.preferred_skill_score == 0

def test_recheck_score_draft_sensitivity():
    """Verify recheck_draft_score responds dynamically to additions in the draft."""
    resp = build_deterministic_fallback(POOR_FORMAT_RESUME, SAMPLE_CALIBRATION_JD)
    initial_score = resp.match_score
    
    # Add missing preferred skills and clear accomplishment bullet to draft
    resp.skills.matching_skills.extend(["Redis", "Kubernetes", "CI/CD"])
    resp.experience[0].bullets.append(
        "Architected distributed caching with Redis and deployed containerized services on Kubernetes with CI/CD."
    )
    
    recheck_res = recheck_draft_score(resp, SAMPLE_CALIBRATION_JD, previous_score=initial_score, previous_breakdown=resp.match_breakdown)
    assert recheck_res.match_score > initial_score
    assert recheck_res.score_delta == recheck_res.match_score - initial_score
    assert recheck_res.factor_deltas["preferred_skills"] > 0
