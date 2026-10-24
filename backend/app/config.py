import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load .env file from backend root or workspace root
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)
load_dotenv()

def _clean_str(val: Optional[str]) -> str:
    if not val:
        return ""
    cleaned = val.strip()
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
        cleaned = cleaned[1:-1].strip()
    return cleaned

class Settings:
    PROJECT_NAME: str = 'Resume Customizer AI'
    VERSION: str = '1.0.0'
    API_V1_PREFIX: str = '/api'
    
    # Validation & Limits
    MAX_FILE_SIZE_MB: int = int(os.getenv('MAX_FILE_SIZE_MB', '5'))
    MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024
    ALLOWED_EXTENSIONS: set = {'.pdf', '.docx'}
    MIN_JD_LENGTH: int = int(os.getenv('MIN_JD_LENGTH', '50'))

    @property
    def ENVIRONMENT(self) -> str:
        if 'ENVIRONMENT' in self.__dict__:
            return self.__dict__['ENVIRONMENT']
        return _clean_str(os.getenv('ENVIRONMENT', 'development'))

    @ENVIRONMENT.setter
    def ENVIRONMENT(self, val: str):
        self.__dict__['ENVIRONMENT'] = val

    @property
    def FRONTEND_URL(self) -> str:
        if 'FRONTEND_URL' in self.__dict__:
            return self.__dict__['FRONTEND_URL']
        return _clean_str(os.getenv('FRONTEND_URL', ''))

    @FRONTEND_URL.setter
    def FRONTEND_URL(self, val: str):
        self.__dict__['FRONTEND_URL'] = val

    @property
    def GEMINI_API_KEY(self) -> str:
        if 'GEMINI_API_KEY' in self.__dict__:
            return self.__dict__['GEMINI_API_KEY']
        val = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY') or os.getenv('GOOGLE_GENAI_API_KEY') or ''
        return _clean_str(val)

    @GEMINI_API_KEY.setter
    def GEMINI_API_KEY(self, val: str):
        self.__dict__['GEMINI_API_KEY'] = val

    @property
    def GROQ_API_KEY(self) -> str:
        if 'GROQ_API_KEY' in self.__dict__:
            return self.__dict__['GROQ_API_KEY']
        return _clean_str(os.getenv('GROQ_API_KEY', ''))

    @GROQ_API_KEY.setter
    def GROQ_API_KEY(self, val: str):
        self.__dict__['GROQ_API_KEY'] = val

    @property
    def LLM_PROVIDER(self) -> str:
        if 'LLM_PROVIDER' in self.__dict__:
            return self.__dict__['LLM_PROVIDER']
        return _clean_str(os.getenv('LLM_PROVIDER', 'gemini'))

    @LLM_PROVIDER.setter
    def LLM_PROVIDER(self, val: str):
        self.__dict__['LLM_PROVIDER'] = val

    @property
    def LLM_MODEL(self) -> str:
        if 'LLM_MODEL' in self.__dict__:
            return self.__dict__['LLM_MODEL']
        return _clean_str(os.getenv('LLM_MODEL', 'gemini-3.5-flash-lite'))

    @LLM_MODEL.setter
    def LLM_MODEL(self, val: str):
        self.__dict__['LLM_MODEL'] = val

    @property
    def SUPABASE_URL(self) -> str:
        if 'SUPABASE_URL' in self.__dict__:
            return self.__dict__['SUPABASE_URL']
        val = (
            os.getenv('SUPABASE_URL') or
            os.getenv('NEXT_PUBLIC_SUPABASE_URL') or
            os.getenv('SUPABASE_PROJECT_URL') or
            ''
        )
        val = _clean_str(val).rstrip('/')
        if not val:
            jwks = self.SUPABASE_JWKS_URL
            if jwks and '/auth/' in jwks:
                val = jwks.split('/auth/')[0].rstrip('/')
        return val

    @SUPABASE_URL.setter
    def SUPABASE_URL(self, val: str):
        self.__dict__['SUPABASE_URL'] = val

    @property
    def SUPABASE_JWKS_URL(self) -> str:
        if 'SUPABASE_JWKS_URL' in self.__dict__:
            return self.__dict__['SUPABASE_JWKS_URL']
        val = (
            os.getenv('SUPABASE_JWKS_URL') or
            os.getenv('NEXT_PUBLIC_SUPABASE_JWKS_URL') or
            ''
        )
        val = _clean_str(val)
        if not val and self.SUPABASE_URL:
            val = f"{self.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        return val

    @SUPABASE_JWKS_URL.setter
    def SUPABASE_JWKS_URL(self, val: str):
        self.__dict__['SUPABASE_JWKS_URL'] = val

    @property
    def SUPABASE_KEY(self) -> str:
        if 'SUPABASE_KEY' in self.__dict__:
            return self.__dict__['SUPABASE_KEY']
        val = (
            os.getenv('SUPABASE_KEY') or
            os.getenv('SUPABASE_PUBLISHABLE_KEY') or
            os.getenv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') or
            os.getenv('SUPABASE_ANON_KEY') or
            os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY') or
            ''
        )
        return _clean_str(val)

    @SUPABASE_KEY.setter
    def SUPABASE_KEY(self, val: str):
        self.__dict__['SUPABASE_KEY'] = val

    @property
    def SUPABASE_PUBLISHABLE_KEY(self) -> str:
        if 'SUPABASE_PUBLISHABLE_KEY' in self.__dict__:
            return self.__dict__['SUPABASE_PUBLISHABLE_KEY']
        return self.SUPABASE_KEY

    @SUPABASE_PUBLISHABLE_KEY.setter
    def SUPABASE_PUBLISHABLE_KEY(self, val: str):
        self.__dict__['SUPABASE_PUBLISHABLE_KEY'] = val

    @property
    def SUPABASE_SECRET_KEY(self) -> str:
        if 'SUPABASE_SECRET_KEY' in self.__dict__:
            return self.__dict__['SUPABASE_SECRET_KEY']
        return _clean_str(os.getenv('SUPABASE_SECRET_KEY', ''))

    @SUPABASE_SECRET_KEY.setter
    def SUPABASE_SECRET_KEY(self, val: str):
        self.__dict__['SUPABASE_SECRET_KEY'] = val

    @property
    def SUPABASE_JWT_SECRET(self) -> str:
        if 'SUPABASE_JWT_SECRET' in self.__dict__:
            return self.__dict__['SUPABASE_JWT_SECRET']
        return _clean_str(os.getenv('SUPABASE_JWT_SECRET', ''))

    @SUPABASE_JWT_SECRET.setter
    def SUPABASE_JWT_SECRET(self, val: str):
        self.__dict__['SUPABASE_JWT_SECRET'] = val

    @property
    def SUPABASE_JWT_ALGORITHM(self) -> str:
        if 'SUPABASE_JWT_ALGORITHM' in self.__dict__:
            return self.__dict__['SUPABASE_JWT_ALGORITHM']
        return _clean_str(os.getenv('SUPABASE_JWT_ALGORITHM', 'ES256'))

    @SUPABASE_JWT_ALGORITHM.setter
    def SUPABASE_JWT_ALGORITHM(self, val: str):
        self.__dict__['SUPABASE_JWT_ALGORITHM'] = val

    @property
    def SUPABASE_JWT_AUDIENCE(self) -> str:
        if 'SUPABASE_JWT_AUDIENCE' in self.__dict__:
            return self.__dict__['SUPABASE_JWT_AUDIENCE']
        return _clean_str(os.getenv('SUPABASE_JWT_AUDIENCE', 'authenticated'))

    @SUPABASE_JWT_AUDIENCE.setter
    def SUPABASE_JWT_AUDIENCE(self, val: str):
        self.__dict__['SUPABASE_JWT_AUDIENCE'] = val

    @property
    def SUPABASE_JWT_ISSUER(self) -> str:
        if 'SUPABASE_JWT_ISSUER' in self.__dict__:
            return self.__dict__['SUPABASE_JWT_ISSUER']
        return _clean_str(os.getenv('SUPABASE_JWT_ISSUER', ''))

    @SUPABASE_JWT_ISSUER.setter
    def SUPABASE_JWT_ISSUER(self, val: str):
        self.__dict__['SUPABASE_JWT_ISSUER'] = val

    @property
    def DATABASE_URL(self) -> str:
        if 'DATABASE_URL' in self.__dict__:
            return self.__dict__['DATABASE_URL']
        return _clean_str(os.getenv('DATABASE_URL', ''))

    @DATABASE_URL.setter
    def DATABASE_URL(self, val: str):
        self.__dict__['DATABASE_URL'] = val

    @property
    def LOCAL_DB_PATH(self) -> str:
        if 'LOCAL_DB_PATH' in self.__dict__:
            return self.__dict__['LOCAL_DB_PATH']
        return _clean_str(os.getenv('LOCAL_DB_PATH', 'E:\\ResumeCustomizerAI\\.tmp\\history.db'))

    @LOCAL_DB_PATH.setter
    def LOCAL_DB_PATH(self, val: str):
        self.__dict__['LOCAL_DB_PATH'] = val
    
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
