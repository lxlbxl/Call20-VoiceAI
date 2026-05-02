"""
Call20 — Configuration
Environment-based settings for all services.
"""
import os
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Application ────────────────────────────────────────────────────────────
    APP_NAME: str = "Call20 API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # ── Database ───────────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://call20:call20_dev@localhost:5432/call20",
    )

    # ── Redis ──────────────────────────────────────────────────────────────────
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # ── Auth ───────────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24

    # ── CORS ───────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://app.call20.ai",
    ]

    # ── External APIs ──────────────────────────────────────────────────────────
    DIDWW_API_KEY: str = os.getenv("DIDWW_API_KEY", "")
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    CARTESIA_API_KEY: str = os.getenv("CARTESIA_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    FIRECRAWL_API_KEY: str = os.getenv("FIRECRAWL_API_KEY", "")
    FIRECRAWL_API_URL: str = os.getenv("FIRECRAWL_API_URL", "https://api.firecrawl.dev")

    # ── Payments ───────────────────────────────────────────────────────────────
    PAYSTACK_SECRET_KEY: str = os.getenv("PAYSTACK_SECRET_KEY", "")
    FLUTTERWAVE_SECRET_KEY: str = os.getenv("FLUTTERWAVE_SECRET_KEY", "")
    USD_TO_NGN_RATE: float = float(os.getenv("USD_TO_NGN_RATE", "1500"))

    # ── Admin ──────────────────────────────────────────────────────────────────
    CALL20_ADMIN_TOKEN: str = os.getenv("CALL20_ADMIN_TOKEN", "")

    # ── URLs ───────────────────────────────────────────────────────────────────
    API_BASE_URL: str = os.getenv("CALL20_API_URL", "http://localhost:8000/api/v1")
    FRONTEND_URL: str = os.getenv("CALL20_FRONTEND_URL", "http://localhost:3000")
    PUBLIC_HOST: str = os.getenv("PUBLIC_HOST", "localhost")

    # ── Rate Limiting ──────────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    # ── Sentry ─────────────────────────────────────────────────────────────────
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()