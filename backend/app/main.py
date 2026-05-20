"""
Call20 — Main FastAPI Application
AI-Powered Voice Agent Platform for African SMEs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import sentry_sdk
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.database import engine, Base
from app.api import (
    auth, tenants, dids, agents, knowledge_bases, calls,
    webhooks, sms, api_keys, admin, payments,
)

# ── Limiter ──────────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

# ── Application Factory ──────────────────────────────────────────────────────

app = FastAPI(
    title="Call20 API",
    description="AI-Powered Voice Agent Platform for African SMEs",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Monitoring ───────────────────────────────────────────────────────────────

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

Instrumentator().instrument(app).expose(app)

# ── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup / Shutdown ───────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    """Initialize resources on startup."""
    if settings.DEBUG:
        logger.info("Starting up Call20 API in DEBUG mode.")


@app.on_event("shutdown")
async def shutdown():
    """Dispose database engine."""
    await engine.dispose()


# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "call20-api",
    }


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(tenants.router)
app.include_router(dids.router)
app.include_router(agents.router)
app.include_router(knowledge_bases.router)
app.include_router(calls.router)
app.include_router(webhooks.router)
app.include_router(sms.router)
app.include_router(api_keys.router)
app.include_router(admin.router)
app.include_router(payments.router)


# ── Error Handlers ────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_id": str(id(exc)),
        },
    )


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )