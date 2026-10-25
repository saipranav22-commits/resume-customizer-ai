import time
import pytest
import jwt
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.models.schemas import (
    ContactInfo,
    SkillsCategorized,
    AtsCompatibility,
    ExperienceItem,
    TailoredResumeResponse,
)

client = TestClient(app)

TEST_SECRET = 'test-supabase-secret-key-32-chars-long!!'

@pytest.fixture(autouse=True)
def configure_test_auth(monkeypatch):
    import tempfile
    import shutil
    import os
    monkeypatch.setattr(settings, 'SUPABASE_JWT_SECRET', TEST_SECRET)
    monkeypatch.setattr(settings, 'SUPABASE_JWT_ALGORITHM', 'HS256')
    monkeypatch.setattr(settings, 'SUPABASE_JWT_AUDIENCE', 'authenticated')
    temp_dir = tempfile.mkdtemp()
    test_db = os.path.join(temp_dir, "test_versioning.db")
    monkeypatch.setattr(settings, 'LOCAL_DB_PATH', test_db)
    monkeypatch.setattr(settings, 'ENVIRONMENT', 'development')
    from app.services.history_service import history_service
    history_service._sqlite_path = test_db
    history_service._init_sqlite()
    yield
    try:
        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception:
        pass

def make_token(user_id='user-v-1', email='tester@example.com'):
    payload = {
        'sub': user_id,
        'email': email,
        'role': 'authenticated',
        'aud': 'authenticated',
        'exp': int(time.time()) + 3600,
        'user_metadata': {'full_name': 'Versioning Tester'}
    }
    return jwt.encode(payload, TEST_SECRET, algorithm='HS256')

def make_sample_resume(candidate_name="Jane Doe", match_score=85, ats_score=90, skills_matching=None, skills_additional=None, bullets=None):
    return TailoredResumeResponse(
        candidate_name=candidate_name,
        contact_info=ContactInfo(
            email=f"{candidate_name.lower().replace(' ', '')}@example.com",
            phone="555-0199",
            location="San Francisco, CA",
            linkedin="linkedin.com/in/janedoe"
        ),
        tailored_summary="Accomplished software engineer with deep expertise in distributed systems and cloud architecture.",
        skills=SkillsCategorized(
            matching_skills=skills_matching or ["Python", "FastAPI", "PostgreSQL", "Docker"],
            additional_skills=skills_additional or ["Kubernetes", "Redis", "CI/CD"]
        ),
        experience=[
            ExperienceItem(
                role="Senior Backend Engineer",
                company="TechCorp Inc",
                duration="2021 - Present",
                bullets=bullets or [
                    "Engineered distributed microservices processing 50M+ requests daily",
                    "Optimized PostgreSQL queries reducing latency by 42%"
                ]
            )
        ],
        match_score=match_score,
        ats_compatibility=AtsCompatibility(
            score=ats_score,
            strengths=["Clear technical impact", "Quantifiable metrics"],
            improvements=["Include certifications if available"]
        ),
        customization_engine="gemini",
        is_llm_generated=True
    )

def test_version_create_independent_root():
    """Verify POST /api/history creates an independent root version with version_number = 1."""
    token = make_token(user_id='user-root-1')
    resume = make_sample_resume("Alice Root")
    payload = {
        'title': 'Senior Python Engineer',
        'target_role': 'Staff Engineer',
        'job_description': 'Looking for an experienced Python developer with distributed systems background.',
        'tailored_result': resume.model_dump(),
        'version_name': 'v1 - Initial Tailoring',
        'version_tags': ['baseline', 'python'],
        'version_notes': 'Initial root draft'
    }

    res = client.post('/api/history', json=payload, headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 201
    data = res.json()
    assert data['version_number'] == 1
    assert data['parent_id'] is None
    assert data['root_id'] == data['id']
    assert data['version_name'] == 'v1 - Initial Tailoring'
    assert data['version_tags'] == ['baseline', 'python']
    assert data['is_starred'] is False

def test_version_fork_child_revision():
    """Verify POST /api/history/{id}/fork branches an existing version into a child revision."""
    token = make_token(user_id='user-fork-1')
    resume = make_sample_resume("Bob Forker")
    root_payload = {
        'title': 'Backend Developer',
        'job_description': 'Senior Backend role at fintech startup.',
        'tailored_result': resume.model_dump(),
    }
    res_root = client.post('/api/history', json=root_payload, headers={'Authorization': f'Bearer {token}'})
    assert res_root.status_code == 201
    root_id = res_root.json()['id']

    fork_payload = {
        'new_version_name': 'v2 - Fintech Emphasis',
        'new_title': 'Fintech Lead Developer',
        'version_notes': 'Highlighted transaction processing experience',
        'version_tags': ['fintech', 'revised']
    }
    res_fork = client.post(f'/api/history/{root_id}/fork', json=fork_payload, headers={'Authorization': f'Bearer {token}'})
    assert res_fork.status_code == 201
    fork_data = res_fork.json()
    assert fork_data['version_number'] == 2
    assert fork_data['parent_id'] == root_id
    assert fork_data['root_id'] == root_id
    assert fork_data['version_name'] == 'v2 - Fintech Emphasis'
    assert fork_data['title'] == 'Fintech Lead Developer'
    assert fork_data['version_tags'] == ['fintech', 'revised']

    # Retrieve detail to verify tailored_result was cloned intact
    res_detail = client.get(f"/api/history/{fork_data['id']}", headers={'Authorization': f'Bearer {token}'})
    assert res_detail.status_code == 200
    assert res_detail.json()['tailored_result']['candidate_name'] == "Bob Forker"

def test_version_list_with_filtering_and_pagination():
    """Verify GET /api/history supports root_id, is_starred, tag, search, and pagination."""
    token = make_token(user_id='user-list-1')
    resume = make_sample_resume("Charlie Lister")
    
    # Create Root A
    res_a = client.post('/api/history', json={
        'title': 'Data Scientist Alpha',
        'job_description': 'Machine learning and deep learning role.',
        'tailored_result': resume.model_dump(),
        'version_tags': ['ml', 'ai']
    }, headers={'Authorization': f'Bearer {token}'})
    root_a_id = res_a.json()['id']

    # Fork Child A2
    client.post(f'/api/history/{root_a_id}/fork', json={
        'new_version_name': 'v2 - NLP Focus',
        'version_tags': ['nlp', 'ml']
    }, headers={'Authorization': f'Bearer {token}'})

    # Create Root B (starred)
    res_b = client.post('/api/history', json={
        'title': 'DevOps Engineer Beta',
        'job_description': 'Cloud infrastructure and Kubernetes role.',
        'tailored_result': resume.model_dump(),
        'version_tags': ['devops', 'cloud']
    }, headers={'Authorization': f'Bearer {token}'})
    root_b_id = res_b.json()['id']

    # Star Root B
    client.patch(f'/api/history/{root_b_id}', json={'is_starred': True}, headers={'Authorization': f'Bearer {token}'})

    # 1. Filter by root_id (should return root A and its child)
    res_filt_root = client.get(f'/api/history?root_id={root_a_id}', headers={'Authorization': f'Bearer {token}'})
    assert res_filt_root.status_code == 200
    items_root = res_filt_root.json()
    assert len(items_root) == 2
    assert all(i['root_id'] == root_a_id for i in items_root)

    # 2. Filter by is_starred=true
    res_starred = client.get('/api/history?is_starred=true', headers={'Authorization': f'Bearer {token}'})
    assert res_starred.status_code == 200
    starred_items = res_starred.json()
    assert len(starred_items) == 1
    assert starred_items[0]['id'] == root_b_id

    # 3. Filter by tag
    res_tag = client.get('/api/history?tag=nlp', headers={'Authorization': f'Bearer {token}'})
    assert res_tag.status_code == 200
    tag_items = res_tag.json()
    assert len(tag_items) == 1
    assert 'nlp' in tag_items[0]['version_tags']

    # 4. Search by keyword
    res_search = client.get('/api/history?search=DevOps', headers={'Authorization': f'Bearer {token}'})
    assert res_search.status_code == 200
    assert len(res_search.json()) >= 1
    assert 'DevOps' in res_search.json()[0]['title']

    # 5. Pagination
    res_page = client.get('/api/history?limit=1&offset=0', headers={'Authorization': f'Bearer {token}'})
    assert res_page.status_code == 200
    assert len(res_page.json()) == 1

def test_version_metadata_update_immutable_snapshot():
    """Verify PATCH /api/history/{id} updates metadata without mutating tailored resume content."""
    token = make_token(user_id='user-meta-1')
    resume = make_sample_resume("Dana Meta", match_score=88, ats_score=92)
    res_create = client.post('/api/history', json={
        'title': 'Original Title',
        'job_description': 'Original JD text at least 50 chars long for immutability testing.',
        'tailored_result': resume.model_dump(),
        'version_name': 'v1 - Initial'
    }, headers={'Authorization': f'Bearer {token}'})
    v_id = res_create.json()['id']

    patch_payload = {
        'title': 'Updated Title For Role',
        'version_name': 'v1.1 - Polished',
        'version_notes': 'Added recruiter feedback notes',
        'version_tags': ['interview-ready'],
        'is_starred': True
    }
    res_patch = client.patch(f'/api/history/{v_id}', json=patch_payload, headers={'Authorization': f'Bearer {token}'})
    assert res_patch.status_code == 200
    patched = res_patch.json()
    assert patched['title'] == 'Updated Title For Role'
    assert patched['version_name'] == 'v1.1 - Polished'
    assert patched['version_notes'] == 'Added recruiter feedback notes'
    assert patched['version_tags'] == ['interview-ready']
    assert patched['is_starred'] is True

    # Retrieve full detail and verify immutable content was NOT corrupted
    res_detail = client.get(f'/api/history/{v_id}', headers={'Authorization': f'Bearer {token}'})
    detail = res_detail.json()
    assert detail['match_score'] == 88
    assert detail['ats_score'] == 92
    assert detail['tailored_result']['candidate_name'] == "Dana Meta"
    assert detail['tailored_result']['match_score'] == 88

def test_version_compare_endpoint():
    """Verify POST /api/history/compare reports score deltas, skills diff, and bullet changes."""
    token = make_token(user_id='user-cmp-1')

    # Version A
    resume_a = make_sample_resume(
        candidate_name="Evan Compare",
        match_score=80,
        ats_score=85,
        skills_matching=["Python", "FastAPI", "SQL"],
        skills_additional=["Docker"],
        bullets=["Built microservices", "Led team of 3"]
    )
    res_a = client.post('/api/history', json={
        'title': 'Version A',
        'job_description': 'Fullstack engineer JD.',
        'tailored_result': resume_a.model_dump(),
        'version_name': 'v1 - Draft'
    }, headers={'Authorization': f'Bearer {token}'})
    id_a = res_a.json()['id']

    # Version B (Fork with updated skills and bullets)
    resume_b = make_sample_resume(
        candidate_name="Evan Compare",
        match_score=92,
        ats_score=95,
        skills_matching=["Python", "FastAPI", "PostgreSQL", "Kubernetes"],
        skills_additional=["Docker", "AWS"],
        bullets=["Built microservices", "Optimized DB query latency by 45%"]
    )
    res_b = client.post('/api/history', json={
        'title': 'Version B',
        'job_description': 'Fullstack engineer JD.',
        'tailored_result': resume_b.model_dump(),
        'version_name': 'v2 - Optimized'
    }, headers={'Authorization': f'Bearer {token}'})
    id_b = res_b.json()['id']

    # Compare
    compare_req = {
        'version_a_id': id_a,
        'version_b_id': id_b
    }
    res_cmp = client.post('/api/history/compare', json=compare_req, headers={'Authorization': f'Bearer {token}'})
    assert res_cmp.status_code == 200
    cmp_data = res_cmp.json()

    assert cmp_data['version_a_id'] == id_a
    assert cmp_data['version_b_id'] == id_b
    assert cmp_data['match_score_delta'] == 12  # 92 - 80
    assert cmp_data['ats_score_delta'] == 10    # 95 - 85

    # Skills comparison
    added_skills_lower = [s.lower() for s in cmp_data['added_skills']]
    assert 'kubernetes' in added_skills_lower
    assert 'aws' in added_skills_lower
    removed_skills_lower = [s.lower() for s in cmp_data['removed_skills']]
    assert 'sql' in removed_skills_lower
    shared_skills_lower = [s.lower() for s in cmp_data['shared_skills']]
    assert 'python' in shared_skills_lower
    assert 'fastapi' in shared_skills_lower

    # Experience diffs
    assert len(cmp_data['experience_diffs']) == 1
    exp_diff = cmp_data['experience_diffs'][0]
    assert exp_diff['company'] == 'TechCorp Inc'
    assert any("45%" in b for b in exp_diff['added_bullets'])
    assert any("Led team" in b for b in exp_diff['removed_bullets'])
    assert any("microservices" in b for b in exp_diff['unchanged_bullets'])

def test_version_export_pdf_docx_txt():
    """Verify GET /api/history/{id}/export/{format} exports PDF, DOCX, and TXT directly."""
    token = make_token(user_id='user-exp-1')
    resume = make_sample_resume("Fiona Exporter")
    res_create = client.post('/api/history', json={
        'title': 'Exporter Resume',
        'job_description': 'Senior Engineer position.',
        'tailored_result': resume.model_dump()
    }, headers={'Authorization': f'Bearer {token}'})
    v_id = res_create.json()['id']

    # 1. Export PDF
    res_pdf = client.get(f'/api/history/{v_id}/export/pdf', headers={'Authorization': f'Bearer {token}'})
    assert res_pdf.status_code == 200
    assert res_pdf.headers['content-type'] == 'application/pdf'
    assert res_pdf.content[:4] == b'%PDF'
    assert 'Fiona_Exporter' in res_pdf.headers['content-disposition']

    # 2. Export DOCX
    res_docx = client.get(f'/api/history/{v_id}/export/docx', headers={'Authorization': f'Bearer {token}'})
    assert res_docx.status_code == 200
    assert 'wordprocessingml' in res_docx.headers['content-type']
    assert res_docx.content[:2] == b'PK'

    # 3. Export TXT
    res_txt = client.get(f'/api/history/{v_id}/export/txt', headers={'Authorization': f'Bearer {token}'})
    assert res_txt.status_code == 200
    assert 'text/plain' in res_txt.headers['content-type']
    assert 'FIONA EXPORTER' in res_txt.text

    # 4. Invalid Format
    res_bad = client.get(f'/api/history/{v_id}/export/xyz', headers={'Authorization': f'Bearer {token}'})
    assert res_bad.status_code == 400
    assert 'Unsupported export format' in res_bad.json()['detail']

def test_version_cross_user_isolation():
    """Verify User B cannot access, fork, modify, compare, or delete User A's version (strict 404)."""
    token_a = make_token(user_id='user-tenant-a')
    token_b = make_token(user_id='user-tenant-b')

    resume = make_sample_resume("Private User A")
    res_a = client.post('/api/history', json={
        'title': 'Confidential Strategy',
        'job_description': 'Exclusive executive position.',
        'tailored_result': resume.model_dump()
    }, headers={'Authorization': f'Bearer {token_a}'})
    id_a = res_a.json()['id']

    # User B attempts GET detail -> 404
    res_get = client.get(f'/api/history/{id_a}', headers={'Authorization': f'Bearer {token_b}'})
    assert res_get.status_code == 404

    # User B attempts PATCH metadata -> 404
    res_patch = client.patch(f'/api/history/{id_a}', json={'title': 'Hacked Title'}, headers={'Authorization': f'Bearer {token_b}'})
    assert res_patch.status_code == 404

    # User B attempts FORK -> 404
    res_fork = client.post(f'/api/history/{id_a}/fork', json={'new_version_name': 'Hacked Fork'}, headers={'Authorization': f'Bearer {token_b}'})
    assert res_fork.status_code == 404

    # User B attempts EXPORT -> 404
    res_exp = client.get(f'/api/history/{id_a}/export/pdf', headers={'Authorization': f'Bearer {token_b}'})
    assert res_exp.status_code == 404

    # User B attempts DELETE -> 404
    res_del = client.delete(f'/api/history/{id_a}', headers={'Authorization': f'Bearer {token_b}'})
    assert res_del.status_code == 404

    # User B attempts COMPARE with User A's item -> 404
    resume_b = make_sample_resume("User B Resume")
    res_b = client.post('/api/history', json={
        'title': 'User B Title',
        'job_description': 'Role.',
        'tailored_result': resume_b.model_dump()
    }, headers={'Authorization': f'Bearer {token_b}'})
    id_b = res_b.json()['id']

    res_cmp = client.post('/api/history/compare', json={'version_a_id': id_a, 'version_b_id': id_b}, headers={'Authorization': f'Bearer {token_b}'})
    assert res_cmp.status_code == 404

def test_version_delete_maintains_history():
    """Verify DELETE /api/history/{id} removes the version without breaking user access."""
    token = make_token(user_id='user-del-1')
    resume = make_sample_resume("George Deletable")
    res_create = client.post('/api/history', json={
        'title': 'Temporary Draft',
        'job_description': 'Draft role.',
        'tailored_result': resume.model_dump()
    }, headers={'Authorization': f'Bearer {token}'})
    v_id = res_create.json()['id']

    # Delete
    res_del = client.delete(f'/api/history/{v_id}', headers={'Authorization': f'Bearer {token}'})
    assert res_del.status_code == 200
    assert 'deleted successfully' in res_del.json()['message']

    # Subsequent GET returns 404
    res_get = client.get(f'/api/history/{v_id}', headers={'Authorization': f'Bearer {token}'})
    assert res_get.status_code == 404

def test_version_unauthenticated_requests_rejected():
    """Verify all versioning endpoints require valid JWT authentication (401)."""
    assert client.get('/api/history').status_code == 401
    assert client.post('/api/history', json={}).status_code == 401
    assert client.get('/api/history/any-id').status_code == 401
    assert client.patch('/api/history/any-id', json={}).status_code == 401
    assert client.post('/api/history/any-id/fork', json={}).status_code == 401
    assert client.post('/api/history/compare', json={}).status_code == 401
    assert client.delete('/api/history/any-id').status_code == 401
    assert client.get('/api/history/any-id/export/pdf').status_code == 401
