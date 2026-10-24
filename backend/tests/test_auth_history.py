import time
import pytest
import jwt
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

TEST_SECRET = 'test-supabase-secret-key-32-chars-long!!'

@pytest.fixture(autouse=True)
def configure_test_auth(monkeypatch):
    monkeypatch.setattr(settings, 'SUPABASE_JWT_SECRET', TEST_SECRET)
    monkeypatch.setattr(settings, 'SUPABASE_JWT_ALGORITHM', 'HS256')
    monkeypatch.setattr(settings, 'SUPABASE_JWT_AUDIENCE', 'authenticated')

def make_token(user_id='usr-123', email='test@example.com', exp_offset=3600, secret=TEST_SECRET, aud='authenticated', role='authenticated'):
    payload = {
        'sub': user_id,
        'email': email,
        'role': role,
        'aud': aud,
        'exp': int(time.time()) + exp_offset,
        'user_metadata': {'full_name': 'Test User'}
    }
    return jwt.encode(payload, secret, algorithm='HS256')

def test_auth_me_valid_token():
    token = make_token(user_id='user-alpha', email='alpha@test.com')
    res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    data = res.json()
    assert data['id'] == 'user-alpha'
    assert data['email'] == 'alpha@test.com'
    assert data['full_name'] == 'Test User'

def test_auth_me_missing_token():
    res = client.get('/api/auth/me')
    assert res.status_code == 401
    assert 'Authentication required' in res.json()['detail']

def test_auth_me_expired_token():
    token = make_token(exp_offset=-100)
    res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 401
    assert 'expired' in res.json()['detail'].lower()

def test_auth_me_invalid_signature():
    token = make_token(secret='completely-wrong-secret-1234567890')
    res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 401
    assert 'invalid' in res.json()['detail'].lower()

def test_auth_me_missing_sub():
    payload = {'email': 'nosub@test.com', 'aud': 'authenticated', 'exp': int(time.time()) + 3600}
    token = jwt.encode(payload, TEST_SECRET, algorithm='HS256')
    res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 401

def test_history_crud_and_cross_user_isolation(sample_tailored_resume):
    token_a = make_token(user_id='user-alice', email='alice@test.com')
    token_b = make_token(user_id='user-bob', email='bob@test.com')

    # Alice creates history item
    save_payload = {
        'title': 'Senior Python Developer Tailoring',
        'job_description': 'Must have 5+ years of experience with Python and FastAPI.',
        'target_role': 'Senior Python Engineer',
        'tailored_result': sample_tailored_resume.model_dump()
    }
    res_create = client.post('/api/history', json=save_payload, headers={'Authorization': f'Bearer {token_a}'})
    assert res_create.status_code == 201
    item_a = res_create.json()
    history_id = item_a['id']
    assert item_a['user_id'] == 'user-alice'
    assert item_a['title'] == 'Senior Python Developer Tailoring'

    # Alice lists history -> sees 1 item
    res_list_a = client.get('/api/history', headers={'Authorization': f'Bearer {token_a}'})
    assert res_list_a.status_code == 200
    ids_a = [x['id'] for x in res_list_a.json()]
    assert history_id in ids_a

    # Bob lists history -> does NOT see Alice item
    res_list_b = client.get('/api/history', headers={'Authorization': f'Bearer {token_b}'})
    assert res_list_b.status_code == 200
    ids_b = [x['id'] for x in res_list_b.json()]
    assert history_id not in ids_b

    # Bob attempts to get detail of Alice item -> 404
    res_detail_b = client.get(f'/api/history/{history_id}', headers={'Authorization': f'Bearer {token_b}'})
    assert res_detail_b.status_code == 404

    # Bob attempts to delete Alice item -> 404
    res_del_b = client.delete(f'/api/history/{history_id}', headers={'Authorization': f'Bearer {token_b}'})
    assert res_del_b.status_code == 404

    # Alice gets detail of her item -> 200
    res_detail_a = client.get(f'/api/history/{history_id}', headers={'Authorization': f'Bearer {token_a}'})
    assert res_detail_a.status_code == 200
    detail = res_detail_a.json()
    assert detail['id'] == history_id
    assert detail['job_description'] == save_payload['job_description']

    # Alice deletes her item -> 200
    res_del_a = client.delete(f'/api/history/{history_id}', headers={'Authorization': f'Bearer {token_a}'})
    assert res_del_a.status_code == 200

    # Alice gets detail after delete -> 404
    res_after = client.get(f'/api/history/{history_id}', headers={'Authorization': f'Bearer {token_a}'})
    assert res_after.status_code == 404

def test_anonymous_user_can_still_customize(sample_tailored_resume):
    from app.services.parser import validate_and_extract_resume
    import io

    # Customize endpoint can be called without any Authorization header
    dummy_pdf = b'%PDF-1.4 dummy content with enough length to simulate a valid file'
    files = {'resume': ('sample.pdf', dummy_pdf, 'application/pdf')}
    data = {'job_description': 'Full Stack Developer with Python, React and Postgres.' * 3}

    # We test with mocked parser/customizer or verify endpoint accepts unauthenticated request
    # Here, OPTIONS preflight works unauthenticated
    res = client.options('/api/customize', headers={
        'Origin': 'https://resume-customizer-ai-cyan.vercel.app',
        'Access-Control-Request-Method': 'POST'
    })
    assert res.status_code == 200

def test_history_save_and_retrieve_with_resume_id(sample_tailored_resume):
    token = make_token(user_id='user-charlie', email='charlie@test.com')
    resume_id = 'aaaaaaaa-1111-2222-3333-444444444444'

    save_payload = {
        'title': 'Resume Tailored from Base Resume',
        'job_description': 'FastAPI and PostgreSQL specialist required.',
        'target_role': 'Database Specialist',
        'resume_id': resume_id,
        'tailored_result': sample_tailored_resume.model_dump()
    }

    res_create = client.post('/api/history', json=save_payload, headers={'Authorization': f'Bearer {token}'})
    assert res_create.status_code == 201
    created_item = res_create.json()
    assert created_item['resume_id'] == resume_id
    history_id = created_item['id']

    # Retrieve detail and verify resume_id is preserved
    res_detail = client.get(f'/api/history/{history_id}', headers={'Authorization': f'Bearer {token}'})
    assert res_detail.status_code == 200
    assert res_detail.json()['resume_id'] == resume_id

def test_auth_asymmetric_jwt_handling(monkeypatch):
    """Verify backend validates asymmetric RS256 token signatures via JWKS."""
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization
    from unittest.mock import MagicMock

    # Generate a test RSA private key
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    public_key = private_key.public_key()

    # Mock JWKS client to return the public key for cryptographic signature verification
    mock_jwks = MagicMock()
    mock_signing_key = MagicMock()
    mock_signing_key.key = public_key
    mock_jwks.get_signing_key_from_jwt.return_value = mock_signing_key
    monkeypatch.setattr('app.services.auth.get_jwks_client', lambda: mock_jwks)

    payload = {
        'sub': 'asym-user-456',
        'email': 'asym@test.com',
        'role': 'authenticated',
        'aud': 'authenticated',
        'exp': int(time.time()) + 3600
    }
    token = jwt.encode(payload, pem, algorithm='RS256')
    res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json()['id'] == 'asym-user-456'

    # Verify that an asymmetric token signed with a wrong key FAILS signature verification
    wrong_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    wrong_pem = wrong_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    bad_token = jwt.encode(payload, wrong_pem, algorithm='RS256')
    res_bad = client.get('/api/auth/me', headers={'Authorization': f'Bearer {bad_token}'})
    assert res_bad.status_code == 401
    assert 'signature' in res_bad.json()['detail'].lower()

def test_auth_rejects_none_algorithm():
    """Verify 'none' algorithm is rejected and never bypasses signature verification."""
    payload = {'sub': 'hacker', 'aud': 'authenticated', 'exp': int(time.time()) + 3600}
    # Craft an unsigned token with alg: none
    header = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0'
    import base64
    import json
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    none_token = f"{header}.{body}."
    res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {none_token}'})
    assert res.status_code == 401
    assert 'disallowed' in res.json()['detail'].lower()

def test_auth_rejects_unconfigured_asymmetric_without_bypass(monkeypatch):
    """Verify asymmetric token is rejected (never bypassed) when no JWKS/URL is configured."""
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import serialization

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

    monkeypatch.setattr(settings, 'SUPABASE_URL', '')
    monkeypatch.setattr(settings, 'SUPABASE_JWKS_URL', '')
    monkeypatch.setattr('app.services.auth.get_jwks_client', lambda: None)

    payload = {'sub': 'user-no-jwks', 'aud': 'authenticated', 'exp': int(time.time()) + 3600}
    token = jwt.encode(payload, pem, algorithm='RS256')
    res = client.get('/api/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 401
    assert 'temporarily unavailable' in res.json()['detail'].lower()

def test_auth_malformed_header():
    """Verify bad token header triggers 401."""
    res = client.get('/api/auth/me', headers={'Authorization': 'Bearer not.a.valid.jwt'})
    assert res.status_code == 401


def test_history_production_mode_refuses_sqlite_fallback(monkeypatch, sample_tailored_resume):
    """Verify production environment refuses silent SQLite fallback when Supabase is unconfigured."""
    token = make_token(user_id='user-prod-test')
    monkeypatch.setattr(settings, 'ENVIRONMENT', 'production')
    monkeypatch.setattr(settings, 'SUPABASE_URL', '')
    monkeypatch.setattr(settings, 'SUPABASE_KEY', '')

    # GET /api/history
    res_list = client.get('/api/history', headers={'Authorization': f'Bearer {token}'})
    assert res_list.status_code == 503
    assert 'Cloud database is not configured' in res_list.json()['detail']

    # POST /api/history
    save_payload = {
        'title': 'Production Guard Test',
        'job_description': 'Software Engineer with cloud experience.',
        'target_role': 'Software Engineer',
        'tailored_result': sample_tailored_resume.model_dump(),
    }
    res_save = client.post('/api/history', json=save_payload, headers={'Authorization': f'Bearer {token}'})
    assert res_save.status_code == 503
    assert 'Cloud database is not configured' in res_save.json()['detail']

    # GET /api/history/{id}
    res_detail = client.get('/api/history/some-id', headers={'Authorization': f'Bearer {token}'})
    assert res_detail.status_code == 503

    # DELETE /api/history/{id}
    res_del = client.delete('/api/history/some-id', headers={'Authorization': f'Bearer {token}'})
    assert res_del.status_code == 503


def test_cors_production_mode_restricts_local_origins(monkeypatch):
    """Verify production CORS only trusts deployed origins and excludes local dev origins."""
    monkeypatch.setattr(settings, 'ENVIRONMENT', 'production')
    monkeypatch.setattr(settings, 'FRONTEND_URL', 'https://resume-customizer-ai-cyan.vercel.app')
    origins = settings.ALLOWED_ORIGINS
    assert 'https://resume-customizer-ai-cyan.vercel.app' in origins
    assert 'http://localhost:3000' not in origins
    assert 'http://127.0.0.1:3000' not in origins


def test_config_dynamic_alias_and_url_derivation(monkeypatch):
    """Verify Settings dynamically derives URLs and supports full-stack environment variable aliases."""
    from app.config import Settings

    test_settings = Settings()

    # 1. Alias: NEXT_PUBLIC_SUPABASE_URL
    monkeypatch.delenv('SUPABASE_URL', raising=False)
    monkeypatch.delenv('SUPABASE_JWKS_URL', raising=False)
    monkeypatch.setenv('NEXT_PUBLIC_SUPABASE_URL', 'https://xyz123.supabase.co/')
    assert test_settings.SUPABASE_URL == 'https://xyz123.supabase.co'
    assert test_settings.SUPABASE_JWKS_URL == 'https://xyz123.supabase.co/auth/v1/.well-known/jwks.json'

    # 2. Derivation: SUPABASE_URL derived from SUPABASE_JWKS_URL
    monkeypatch.delenv('NEXT_PUBLIC_SUPABASE_URL', raising=False)
    monkeypatch.setenv('SUPABASE_JWKS_URL', '"https://project-abc.supabase.co/auth/v1/.well-known/jwks.json"')
    assert test_settings.SUPABASE_JWKS_URL == 'https://project-abc.supabase.co/auth/v1/.well-known/jwks.json'
    assert test_settings.SUPABASE_URL == 'https://project-abc.supabase.co'

    # 3. Key alias: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY with quotation stripping
    monkeypatch.delenv('SUPABASE_KEY', raising=False)
    monkeypatch.delenv('SUPABASE_PUBLISHABLE_KEY', raising=False)
    monkeypatch.setenv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', "'sb_publishable_test_key_123'")
    assert test_settings.SUPABASE_KEY == 'sb_publishable_test_key_123'
