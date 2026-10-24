import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend root or workspace root
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME: str = 'Resume Customizer AI'
    VERSION: str = '1.0.0'
    API_V1_PREFIX: str = '/api'
    ENVIRONMENT: str = os.getenv('ENVIRONMENT', 'development')
    FRONTEND_URL: str = os.getenv('FRONTEND_URL', '')
    
    # LLM Settings
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')
    GROQ_API_KEY: str = os.getenv('GROQ_API_KEY', '')
    LLM_PROVIDER: str = os.getenv('LLM_PROVIDER', 'gemini')  # 'gemini' or 'groq'
    LLM_MODEL: str = os.getenv('LLM_MODEL', 'gemini-3.5-flash-lite')
    
    # Validation & Limits
    MAX_FILE_SIZE_MB: int = int(os.getenv('MAX_FILE_SIZE_MB', '5'))
    MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024
    ALLOWED_EXTENSIONS: set = {'.pdf', '.docx'}
    MIN_JD_LENGTH: int = int(os.getenv('MIN_JD_LENGTH', '50'))

    # Supabase & Auth Settings
    SUPABASE_URL: str = os.getenv('SUPABASE_URL', '')
    SUPABASE_JWKS_URL: str = os.getenv('SUPABASE_JWKS_URL', '')
    SUPABASE_PUBLISHABLE_KEY: str = os.getenv('SUPABASE_PUBLISHABLE_KEY', '')
    SUPABASE_SECRET_KEY: str = os.getenv('SUPABASE_SECRET_KEY', '')
    # Standard client-facing key for PostgREST (prefers publishable key, strictly preserving RLS)
    SUPABASE_KEY: str = (
        os.getenv('SUPABASE_KEY') or
        os.getenv('SUPABASE_PUBLISHABLE_KEY') or
        ''
    )
    SUPABASE_JWT_SECRET: str = os.getenv('SUPABASE_JWT_SECRET', '')
    SUPABASE_JWT_ALGORITHM: str = os.getenv('SUPABASE_JWT_ALGORITHM', 'HS256')
    SUPABASE_JWT_AUDIENCE: str = os.getenv('SUPABASE_JWT_AUDIENCE', 'authenticated')
    SUPABASE_JWT_ISSUER: str = os.getenv('SUPABASE_JWT_ISSUER', '')
    DATABASE_URL: str = os.getenv('DATABASE_URL', '')
    LOCAL_DB_PATH: str = os.getenv('LOCAL_DB_PATH', 'E:\\ResumeCustomizerAI\\.tmp\\history.db')
    
    # Explicit trusted production origins
    DEFAULT_TRUSTED_ORIGINS: list[str] = [
        'https://resume-customizer-ai-cyan.vercel.app',
    ]
    # Local development origins (only permitted outside production)
    LOCAL_DEVELOPMENT_ORIGINS: list[str] = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
    ]

    # CORS
    @property
    def ALLOWED_ORIGINS(self) -> list[str]:
        origins = list(self.DEFAULT_TRUSTED_ORIGINS)

        if self.ENVIRONMENT.lower() != 'production':
            for local_origin in self.LOCAL_DEVELOPMENT_ORIGINS:
                if local_origin not in origins:
                    origins.append(local_origin)

        env_origins = os.getenv('ALLOWED_ORIGINS', '')
        if env_origins.strip():
            for o in env_origins.split(','):
                cleaned = o.strip().rstrip('/')
                if cleaned and cleaned not in origins:
                    origins.append(cleaned)

        if self.FRONTEND_URL and self.FRONTEND_URL.strip():
            cleaned_frontend = self.FRONTEND_URL.strip().rstrip('/')
            if cleaned_frontend and cleaned_frontend not in origins:
                origins.append(cleaned_frontend)

        return origins

settings = Settings()
