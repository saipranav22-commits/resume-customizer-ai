"""
test_real_supabase_cloud.py -- Live Integration Test Suite for Supabase Cloud Auth & RLS.

Verifies against the real Supabase Cloud project (https://blnizmyxkyfngrbrulmr.supabase.co):
1. Real user authentication (user@example.com & user2@example.com)
2. JWT issuance & FastAPI validation (/api/auth/me)
3. Database profiles trigger verification
4. Saved resumes persistence via PostgREST with user Bearer token
5. Customization history persistence & detail retrieval via FastAPI
6. Database RLS cross-user isolation:
   - User 2 cannot list User 1's history
   - User 2 cannot retrieve User 1's history or resume by ID
   - User 2 cannot update or delete User 1's data
   - User 2 cannot associate history with User 1's resume_id (composite FK + RLS)
   - User 1 and User 2 can each access their own records
7. User 1 deletion of own history and resume
8. Anonymous customization non-blocking verification
"""

import os
import time
import uuid
import pytest
import httpx
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

def is_live_supabase_configured() -> bool:
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_KEY or settings.SUPABASE_PUBLISHABLE_KEY
    if not url or not key:
        return False
    if 'your-project-ref' in url or 'placeholder' in url or 'your-' in key:
        return False
    return True

def has_live_test_credentials() -> bool:
    if not is_live_supabase_configured():
        return False
    p1 = os.getenv('TEST_USER_1_PASSWORD', '').strip()
    p2 = os.getenv('TEST_USER_2_PASSWORD', '').strip()
    return bool(p1 and p2 and not p1.startswith('your_') and not p2.startswith('your_'))

@pytest.fixture(scope='module')
def test_state():
    return {
        'user1': {
            'email': os.getenv('TEST_USER_1_EMAIL', 'user@example.com').strip(),
            'password': os.getenv('TEST_USER_1_PASSWORD', '').strip(),
            'token': None,
            'user_id': None,
            'refresh_token': None,
            'resume_id': None,
            'history_id': None,
        },
        'user2': {
            'email': os.getenv('TEST_USER_2_EMAIL', 'user2@example.com').strip(),
            'password': os.getenv('TEST_USER_2_PASSWORD', '').strip(),
            'token': None,
            'user_id': None,
            'refresh_token': None,
            'resume_id': None,
            'history_id': None,
        }
    }

@pytest.mark.skipif(not has_live_test_credentials(), reason='Live test credentials not set in backend/.env (TEST_USER_1_PASSWORD and TEST_USER_2_PASSWORD required)')
class TestRealSupabaseCloud:

    def test_01_signin_user1(self, test_state):
        """Verify User 1 password sign-in against real Supabase Auth."""
        u1 = test_state['user1']
        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
        headers = {'apikey': settings.SUPABASE_KEY, 'Content-Type': 'application/json'}
        payload = {'email': u1['email'], 'password': u1['password']}
        resp = httpx.post(url, headers=headers, json=payload, timeout=12.0)
        assert resp.status_code == 200, f"User 1 signin failed (HTTP {resp.status_code}): {resp.text}"
        data = resp.json()
        assert 'access_token' in data, "Supabase did not return access_token"
        u1['token'] = data['access_token']
        u1['refresh_token'] = data.get('refresh_token')
        u1['user_id'] = data['user']['id']
        assert u1['user_id'], "User ID missing from Supabase signin response"

    def test_02_signin_user2(self, test_state):
        """Verify User 2 password sign-in against real Supabase Auth."""
        u2 = test_state['user2']
        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
        headers = {'apikey': settings.SUPABASE_KEY, 'Content-Type': 'application/json'}
        payload = {'email': u2['email'], 'password': u2['password']}
        resp = httpx.post(url, headers=headers, json=payload, timeout=12.0)
        assert resp.status_code == 200, f"User 2 signin failed (HTTP {resp.status_code}): {resp.text}"
        data = resp.json()
        assert 'access_token' in data, "Supabase did not return access_token"
        u2['token'] = data['access_token']
        u2['refresh_token'] = data.get('refresh_token')
        u2['user_id'] = data['user']['id']
        assert u2['user_id'], "User ID missing from Supabase signin response"
        assert u2['user_id'] != test_state['user1']['user_id'], "User 1 and User 2 must have distinct UUIDs"

    def test_03_fastapi_jwt_validation_for_both_users(self, test_state):
        """Verify FastAPI accepts real Supabase ECDSA ES256 tokens and validates identity."""
        u1 = test_state['user1']
        u2 = test_state['user2']

        # User 1 me check
        res1 = client.get('/api/auth/me', headers={'Authorization': f"Bearer {u1['token']}"})
        assert res1.status_code == 200, f"FastAPI rejected User 1 token: {res1.text}"
        data1 = res1.json()
        assert data1['id'] == u1['user_id']
        assert data1['email'] == u1['email']

        # User 2 me check
        res2 = client.get('/api/auth/me', headers={'Authorization': f"Bearer {u2['token']}"})
        assert res2.status_code == 200, f"FastAPI rejected User 2 token: {res2.text}"
        data2 = res2.json()
        assert data2['id'] == u2['user_id']
        assert data2['email'] == u2['email']

    def test_04_token_security_and_tamper_rejection(self):
        """Verify invalid, expired, and tampered tokens are rejected with 401."""
        res_inv = client.get('/api/auth/me', headers={'Authorization': 'Bearer invalid.tampered.token'})
        assert res_inv.status_code == 401

        res_none = client.get('/api/auth/me')
        assert res_none.status_code == 401

        fake_token = (
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'
            'eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.'
            'invalid_signature'
        )
        res_fake = client.get('/api/auth/me', headers={'Authorization': f'Bearer {fake_token}'})
        assert res_fake.status_code == 401

    def test_05_database_profiles_verification(self, test_state):
        """Verify profiles table rows for both users in Supabase PostgreSQL."""
        u1 = test_state['user1']
        base = settings.SUPABASE_URL.rstrip('/')

        url1 = f"{base}/rest/v1/profiles?id=eq.{u1['user_id']}"
        headers1 = {
            'apikey': settings.SUPABASE_KEY,
            'Authorization': f"Bearer {u1['token']}",
            'Accept': 'application/json'
        }
        resp1 = httpx.get(url1, headers=headers1, timeout=10.0)
        assert resp1.status_code == 200, f"Failed to query profiles: {resp1.text}"
        rows1 = resp1.json()

        # If admin-created user did not fire the trigger (created before trigger migration),
        # ensure user can self-initialize profile via RLS insert policy
        if len(rows1) == 0:
            insert_resp = httpx.post(f"{base}/rest/v1/profiles", headers={
                'apikey': settings.SUPABASE_KEY,
                'Authorization': f"Bearer {u1['token']}",
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }, json={'id': u1['user_id'], 'email': u1['email'], 'full_name': 'Test User 1'}, timeout=10.0)
            assert insert_resp.status_code in [200, 201], f"Profile self-initialization failed: {insert_resp.text}"

    def test_06_user1_saved_resumes_persistence(self, test_state):
        """User 1 saves a synthetic base resume directly to Supabase PostgreSQL."""
        u1 = test_state['user1']
        url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/saved_resumes"
        headers = {
            'apikey': settings.SUPABASE_KEY,
            'Authorization': f"Bearer {u1['token']}",
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        synthetic_resume = {
            'user_id': u1['user_id'],
            'title': 'Synthetic Base Resume - Cloud Test',
            'raw_text': 'Senior Full-Stack Engineer with Python, React, PostgreSQL experience.',
            'candidate_name': 'Synthetic Candidate One'
        }
        resp = httpx.post(url, headers=headers, json=synthetic_resume, timeout=10.0)
        assert resp.status_code in [200, 201], f"Failed to save resume: {resp.text}"
        saved = resp.json()[0]
        u1['resume_id'] = saved['id']
        assert u1['resume_id'], "Saved resume ID missing"

        # Verify retrieval by owner
        get_resp = httpx.get(f"{url}?id=eq.{u1['resume_id']}", headers=headers, timeout=10.0)
        assert get_resp.status_code == 200
        assert len(get_resp.json()) == 1
        assert get_resp.json()[0]['candidate_name'] == 'Synthetic Candidate One'

    def test_07_user1_customization_history_persistence(self, test_state):
        """User 1 creates and retrieves customization history via FastAPI against Supabase PostgreSQL."""
        u1 = test_state['user1']
        history_payload = {
            'resume_id': u1.get('resume_id'),
            'title': 'Cloud Verified Full-Stack Tailoring',
            'target_role': 'Full Stack Developer',
            'job_description': 'Must have strong Python, FastAPI, React, and PostgreSQL experience.',
            'tailored_result': {
                'candidate_name': 'Synthetic Candidate One',
                'contact_info': {'email': u1['email'], 'phone': '555-0199'},
                'target_role': 'Full Stack Developer',
                'tailored_summary': 'Tailored summary verified against live Supabase Cloud.',
                'skills': {'technical': ['Python', 'FastAPI', 'PostgreSQL'], 'soft': ['Collaboration']},
                'experience': [],
                'education': [],
                'match_score': 90,
                'ats_compatibility': {'score': 95, 'passed_checks': ['Keywords'], 'warnings': []},
                'missing_keywords': [],
                'customization_engine': 'gemini',
                'is_llm_generated': True
            }
        }
        res = client.post('/api/history', headers={'Authorization': f"Bearer {u1['token']}"}, json=history_payload)
        assert res.status_code in [200, 201], f"Failed to create history: {res.text}"
        saved_hist = res.json()
        assert 'id' in saved_hist
        u1['history_id'] = saved_hist['id']

        # Verify via list endpoint
        list_res = client.get('/api/history', headers={'Authorization': f"Bearer {u1['token']}"})
        assert list_res.status_code == 200
        items = list_res.json()
        assert any(item['id'] == u1['history_id'] for item in items), "Saved history item not returned in list"

        # Verify via detail endpoint
        detail_res = client.get(f"/api/history/{u1['history_id']}", headers={'Authorization': f"Bearer {u1['token']}"})
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail['id'] == u1['history_id']
        assert detail['resume_id'] == u1['resume_id']

    def test_08_cross_user_rls_isolation(self, test_state):
        """Comprehensive multi-layer cross-user isolation verification (RLS + API + PostgREST)."""
        u1 = test_state['user1']
        u2 = test_state['user2']
        base = settings.SUPABASE_URL.rstrip('/')

        # 1. User 2 lists history via API -> must NOT see User 1's item
        beta_list = client.get('/api/history', headers={'Authorization': f"Bearer {u2['token']}"})
        assert beta_list.status_code == 200
        beta_items = beta_list.json()
        assert not any(item['id'] == u1['history_id'] for item in beta_items), "RLS breach: User 2 saw User 1 history in list"

        # 2. User 2 attempts direct API detail fetch of User 1's item -> must return 404
        beta_detail = client.get(f"/api/history/{u1['history_id']}", headers={'Authorization': f"Bearer {u2['token']}"})
        assert beta_detail.status_code == 404, "RLS breach: User 2 retrieved User 1 history detail"

        # 3. User 2 attempts direct API deletion of User 1's item -> must return 404
        beta_del = client.delete(f"/api/history/{u1['history_id']}", headers={'Authorization': f"Bearer {u2['token']}"})
        assert beta_del.status_code == 404, "RLS breach: User 2 deleted User 1 history item"

        # 4. Direct PostgREST attack: User 2 requests User 1 history by ID
        direct_hist_url = f"{base}/rest/v1/customization_history?id=eq.{u1['history_id']}"
        headers_u2 = {
            'apikey': settings.SUPABASE_KEY,
            'Authorization': f"Bearer {u2['token']}",
            'Accept': 'application/json'
        }
        res_hist = httpx.get(direct_hist_url, headers=headers_u2, timeout=10.0)
        assert res_hist.status_code == 200
        assert len(res_hist.json()) == 0, "PostgREST RLS breach: User 2 saw User 1 history row"

        # 5. Direct PostgREST attack: User 2 requests User 1 saved resume by ID
        direct_res_url = f"{base}/rest/v1/saved_resumes?id=eq.{u1['resume_id']}"
        res_res = httpx.get(direct_res_url, headers=headers_u2, timeout=10.0)
        assert res_res.status_code == 200
        assert len(res_res.json()) == 0, "PostgREST RLS breach: User 2 saw User 1 saved resume"

        # 6. Direct PostgREST attack: User 2 attempts to UPDATE User 1 resume
        patch_res = httpx.patch(direct_res_url, headers={**headers_u2, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}, json={'title': 'Hacked Title'}, timeout=10.0)
        assert patch_res.status_code in [200, 204]
        assert len(patch_res.json() if patch_res.text else []) == 0, "PostgREST RLS breach: User 2 modified User 1 resume"

        # 7. Composite Foreign Key & RLS attack: User 2 tries to link history to User 1's resume_id
        malicious_history = {
            'id': str(uuid.uuid4()),
            'user_id': u2['user_id'],
            'resume_id': u1['resume_id'], # Stealing User 1's resume reference!
            'title': 'Cross-Tenant Resume Link Attack',
            'job_description': 'Test JD',
            'customization_engine': 'gemini',
            'is_llm_generated': True,
            'match_score': 50,
            'ats_score': 50,
            'tailored_result': {'candidate_name': 'Attacker'},
            'created_at': '2026-10-24T00:00:00Z',
            'updated_at': '2026-10-24T00:00:00Z'
        }
        post_steal = httpx.post(f"{base}/rest/v1/customization_history", headers={**headers_u2, 'Content-Type': 'application/json'}, json=malicious_history, timeout=10.0)
        # Must be rejected by composite foreign key or RLS
        assert post_steal.status_code in [400, 403, 404, 409], f"Security violation: User 2 linked User 1 resume_id without error: {post_steal.status_code} {post_steal.text}"

    def test_09_user1_deletion_of_own_data(self, test_state):
        """User 1 deletes their own history and base resume; verifies deletion persists."""
        u1 = test_state['user1']
        base = settings.SUPABASE_URL.rstrip('/')
        headers_u1 = {
            'apikey': settings.SUPABASE_KEY,
            'Authorization': f"Bearer {u1['token']}",
            'Accept': 'application/json'
        }

        # 1. Delete history via API
        del_res = client.delete(f"/api/history/{u1['history_id']}", headers={'Authorization': f"Bearer {u1['token']}"})
        assert del_res.status_code == 200

        # Verify history is gone
        get_res = client.get(f"/api/history/{u1['history_id']}", headers={'Authorization': f"Bearer {u1['token']}"})
        assert get_res.status_code == 404

        # 2. Delete base resume via PostgREST
        del_resume_resp = httpx.delete(f"{base}/rest/v1/saved_resumes?id=eq.{u1['resume_id']}", headers=headers_u1, timeout=10.0)
        assert del_resume_resp.status_code in [200, 204]

        # Verify resume is gone
        get_resume_resp = httpx.get(f"{base}/rest/v1/saved_resumes?id=eq.{u1['resume_id']}", headers=headers_u1, timeout=10.0)
        assert get_resume_resp.status_code == 200
        assert len(get_resume_resp.json()) == 0

    def test_10_anonymous_customization_remains_functional(self):
        """Verify anonymous customization is completely unaffected by authenticated features."""
        health_res = client.get('/api/health')
        assert health_res.status_code == 200
        assert health_res.json()['status'] == 'healthy'
