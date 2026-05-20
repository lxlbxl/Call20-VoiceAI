"""
Call20 — Authentication Service (Phase 1)
JWT tokens, bcrypt password hashing, 2FA TOTP, email verification.
"""
import uuid
import secrets
import hashlib
import hmac
import base64
import struct
import time
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.tenant import User, Tenant, UserRole

security = HTTPBearer(auto_error=False)


# ── Password Hashing ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password with bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# ── JWT Tokens ────────────────────────────────────────────────────────────────

def create_access_token(user_id: uuid.UUID, tenant_id: uuid.UUID, role: str) -> str:
    """Create a JWT access token (8-hour expiry)."""
    payload = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=8),
        "iat": datetime.utcnow(),
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: uuid.UUID) -> str:
    """Create a JWT refresh token (30-day expiry)."""
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(days=30),
        "iat": datetime.utcnow(),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# ── Current User Dependency ───────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the current user from the JWT token."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = uuid.UUID(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Check tenant status
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if tenant is None or tenant.status.value != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

    return user


def require_role(required_role: UserRole):
    """Dependency factory to check user role."""
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role.value not in (required_role.value, "owner", "admin"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return role_checker


# ── Two-Factor Authentication (TOTP) ─────────────────────────────────────────

def generate_totp_secret() -> str:
    """Generate a random TOTP secret in Base32 format."""
    return base64.b32encode(secrets.token_bytes(20)).decode("utf-8")


def generate_totp_uri(secret: str, email: str, tenant_name: str) -> str:
    """Generate a provisioning URI for Google Authenticator."""
    issuer = "Call20"
    return f"otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}&digits=6&period=30"


def verify_totp_token(secret: str, token: str) -> bool:
    """Verify a TOTP token."""
    try:
        token_int = int(token)
    except ValueError:
        return False

    secret_bytes = base64.b32decode(secret.upper())
    current_time = int(time.time())

    # Check current and adjacent 30-second windows (±1 step tolerance)
    for offset in [-1, 0, 1]:
        time_step = (current_time // 30) + offset
        msg = struct.pack(">Q", time_step)
        hmac_digest = hmac.new(secret_bytes, msg, hashlib.sha1).digest()
        o = hmac_digest[19] & 0x0F
        code = (struct.unpack(">I", hmac_digest[o:o+4])[0] & 0x7FFFFFFF) % 10**6

        if code == token_int:
            return True

    return False


# ── Email Verification ────────────────────────────────────────────────────────

def generate_verification_token() -> str:
    """Generate a random email verification token."""
    return secrets.token_urlsafe(32)


# ── API Key Management ────────────────────────────────────────────────────────

def generate_api_key() -> tuple[str, str]:
    """Generate an API key. Returns (full_key, hashed_key_for_storage)."""
    full_key = f"sk_call20_{secrets.token_urlsafe(32)}"
    hashed_key = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, hashed_key


def verify_api_key(provided_key: str, stored_hash: str) -> bool:
    """Verify an API key against its stored hash."""
    provided_hash = hashlib.sha256(provided_key.encode()).hexdigest()
    return hmac.compare_digest(provided_hash, stored_hash)