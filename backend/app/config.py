import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend root or workspace root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    PROJECT_NAME: str = "Resume Customizer AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "")
    
    # LLM Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")  # "gemini" or "groq"
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-3.5-flash-lite")
    
    # Validation & Limits
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "5"))
    MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024
    ALLOWED_EXTENSIONS: set = {".pdf", ".docx"}
    MIN_JD_LENGTH: int = int(os.getenv("MIN_JD_LENGTH", "50"))
    
    # CORS
    @property
    def ALLOWED_ORIGINS(self) -> list[str]:
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "https://*.vercel.app",
            "*"
        ]
        if self.FRONTEND_URL and self.FRONTEND_URL.strip():
            cleaned_frontend = self.FRONTEND_URL.strip().rstrip("/")
            if cleaned_frontend not in origins:
                origins.insert(0, cleaned_frontend)
        return origins

settings = Settings()
