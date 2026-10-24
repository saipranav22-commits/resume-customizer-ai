import time
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import Header, HTTPException, status
import jwt
import httpx
from app.config import settings

class AuthenticatedUser(BaseModel):
    id: str = Field(description='User UUID extracted from verified JWT sub claim')
    email: Optional[str] = None
    role: str = 'authenticated'
    user_metadata: Dict[str, Any] = Field(default_factory=dict)

def extract_bearer_token(auth_header: Optional[str]) -> Optional[str]:
    if not auth_header:
        return None
    parts = auth_header.strip().split()
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1]
    if len(parts) == 1:
        return parts[0]
    return None

# Module-level JWKS client cache for asymmetric keys
_jwks_client: Optional[jwt.PyJWKClient] = None
_jwks_url: Optional[str] = None

def get_jwks_url() -> Optional[str]:
    """Resolve the JWKS URL from explicit config or derive safely from SUPABASE_URL."""
    if hasattr(settings, 'SUPABASE_JWKS_URL') and settings.SUPABASE_JWKS_URL and settings.SUPABASE_JWKS_URL.strip():
        return settings.SUPABASE_JWKS_URL.strip()
    if settings.SUPABASE_URL and settings.SUPABASE_URL.strip():
        return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    return None

def get_jwks_client() -> Optional[jwt.PyJWKClient]:
    global _jwks_client, _jwks_url
    url = get_jwks_url()
    if not url:
        return None
    if _jwks_client is None or _jwks_url != url:
        _jwks_url = url
        _jwks_client = jwt.PyJWKClient(url, cache_keys=True, max_cached_keys=16)
    return _jwks_client

def _verify_via_supabase_user_endpoint(clean_token: str) -> Optional[AuthenticatedUser]:
    """Verify JWT against Supabase Auth user endpoint as secure standard fallback."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_URL.strip():
        return None
    try:
        auth_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
        api_key = settings.SUPABASE_KEY or getattr(settings, 'SUPABASE_PUBLISHABLE_KEY', '') or clean_token
        headers = {
            'Authorization': f'Bearer {clean_token}',
            'apikey': api_key
        }
        with httpx.Client(timeout=10.0) as client:
            res = client.get(auth_url, headers=headers)
        if res.status_code == 200:
            data = res.json()
            return AuthenticatedUser(
                id=data.get('id', ''),
                email=data.get('email'),
                role=data.get('role', 'authenticated'),
                user_metadata=data.get('user_metadata', {})
            )
        return None
    except Exception:
        return None

def verify_supabase_jwt(token: str) -> AuthenticatedUser:
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Authentication token is empty or missing'
        )

    clean_token = token.strip()
    payload = None

    # Inspect token header
    try:
        header = jwt.get_unverified_header(clean_token)
        alg = header.get('alg', '')
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f'Malformed authentication token header: {str(e)}'
        )

    # Strictly disallow insecure or unexpected algorithms (never trust 'none' or unverified alg)
    ALLOWED_ALGORITHMS = {'RS256', 'ES256', 'HS256'}
    if alg not in ALLOWED_ALGORITHMS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f'Unsupported or disallowed JWT signing algorithm: {alg or "none"}'
        )

    # Determine expected issuer and audience
    expected_issuer = (
        settings.SUPABASE_JWT_ISSUER.strip()
        if getattr(settings, 'SUPABASE_JWT_ISSUER', '').strip()
        else None
    )
    expected_audience = settings.SUPABASE_JWT_AUDIENCE.strip() if settings.SUPABASE_JWT_AUDIENCE.strip() else None

    # Mandatory cryptographic signature, expiration, and audience verification options
    decode_options = {
        'verify_signature': True,
        'verify_exp': True,
        'verify_aud': bool(expected_audience),
        'verify_iss': bool(expected_issuer),
    }

    common_kwargs: Dict[str, Any] = {
        'options': decode_options,
    }
    if expected_audience:
        common_kwargs['audience'] = expected_audience
    if expected_issuer:
        common_kwargs['issuer'] = expected_issuer

    # 1. Asymmetric key verification (RS256, ES256) via Supabase JWKS
    if alg in ('RS256', 'ES256'):
        jwks = get_jwks_client()
        if jwks:
            try:
                signing_key = jwks.get_signing_key_from_jwt(clean_token)
                payload = jwt.decode(
                    clean_token,
                    signing_key.key,
                    algorithms=[alg],
                    **common_kwargs
                )
            except jwt.ExpiredSignatureError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='Authentication token has expired'
                )
            except jwt.InvalidAudienceError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='Invalid token audience'
                )
            except jwt.InvalidIssuerError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='Invalid token issuer'
                )
            except Exception:
                # If local JWKS key retrieval fails, verify via Supabase Auth user endpoint
                user = _verify_via_supabase_user_endpoint(clean_token)
                if user:
                    return user
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='Invalid asymmetric authentication token signature'
                )
        elif settings.SUPABASE_URL and settings.SUPABASE_URL.strip():
            user = _verify_via_supabase_user_endpoint(clean_token)
            if user:
                return user
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Supabase token verification failed'
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Cannot verify asymmetric token signature: No JWKS or Supabase URL configured'
            )

    # 2. Symmetric key verification (HS256) via shared secret
    elif alg == 'HS256':
        if settings.SUPABASE_JWT_SECRET and settings.SUPABASE_JWT_SECRET.strip():
            try:
                payload = jwt.decode(
                    clean_token,
                    settings.SUPABASE_JWT_SECRET.strip(),
                    algorithms=['HS256'],
                    **common_kwargs
                )
            except jwt.ExpiredSignatureError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='Authentication token has expired'
                )
            except jwt.InvalidAudienceError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='Invalid token audience'
                )
            except jwt.InvalidIssuerError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail='Invalid token issuer'
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f'Invalid authentication token signature: {str(e)}'
                )
        elif settings.SUPABASE_URL and settings.SUPABASE_URL.strip():
            user = _verify_via_supabase_user_endpoint(clean_token)
            if user:
                return user
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Supabase token verification failed'
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Cannot verify symmetric token signature: SUPABASE_JWT_SECRET or SUPABASE_URL required'
            )

    # Extract claims from verified payload
    user_id = payload.get('sub')
    if not user_id or not isinstance(user_id, str) or not user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token missing required subject claim (sub)'
        )

    email = payload.get('email')
    role = payload.get('role', 'authenticated')
    user_metadata = payload.get('user_metadata', {})

    return AuthenticatedUser(
        id=user_id.strip(),
        email=email,
        role=role,
        user_metadata=user_metadata
    )

async def get_current_user_optional(
    authorization: Optional[str] = Header(None)
) -> Optional[AuthenticatedUser]:
    token = extract_bearer_token(authorization)
    if not token:
        return None
    return verify_supabase_jwt(token)

async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> AuthenticatedUser:
    token = extract_bearer_token(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Authentication required. Missing Bearer token in Authorization header.'
        )
    return verify_supabase_jwt(token)
