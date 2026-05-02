"""
Call20 — API Key Service (Phase 1)
API key generation, verification, and management for Scale/Enterprise plans.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.tenant import Tenant, User, UserRole
from app.services.auth_service import generate_api_key, verify_api_key


# ── API Key Model (stored in users table with role=api_key) ───────────────────

async def create_api_key(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    name: str,
    scope: str,
) -> tuple[User, str]:
    """
    Create an API key. Returns (user_record, full_key).
    The full key is shown only once at creation.
    """
    # Check plan eligibility
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant or tenant.plan.value not in ("scale", "enterprise"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API keys are available on Scale and Enterprise plans only.",
        )

    full_key, hashed_key = generate_api_key()

    # Create a headless user record for the API key
    api_key_user = User(
        tenant_id=tenant_id,
        email=f"apikey_{uuid.uuid4().hex[:12]}@call20.internal",
        password_hash=hashed_key,
        full_name=name,
        role=UserRole.API_KEY,
        is_verified=True,
    )
    db.add(api_key_user)
    await db.flush()

    return api_key_user, full_key


async def list_api_keys(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[User]:
    """List all API keys for a tenant (without the actual key)."""
    result = await db.execute(
        select(User)
        .where(User.tenant_id == tenant_id, User.role == UserRole.API_KEY)
        .order_by(User.created_at.desc())
    )
    return list(result.scalars().all())


async def revoke_api_key(
    db: AsyncSession, api_key_id: uuid.UUID, tenant_id: uuid.UUID
) -> bool:
    """Revoke (delete) an API key."""
    result = await db.execute(
        select(User).where(User.id == api_key_id, User.tenant_id == tenant_id)
    )
    api_key_user = result.scalar_one_or_none()
    if not api_key_user or api_key_user.role != UserRole.API_KEY:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    await db.delete(api_key_user)
    await db.flush()
    return True


async def authenticate_api_key(
    db: AsyncSession, provided_key: str
) -> Optional[User]:
    """Authenticate a request using an API key."""
    # Find all API key users and check the key
    result = await db.execute(select(User).where(User.role == UserRole.API_KEY))
    api_key_users = list(result.scalars().all())

    for user in api_key_users:
        if verify_api_key(provided_key, user.password_hash):
            # Check tenant status
            tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
            tenant = tenant_result.scalar_one_or_none()
            if tenant and tenant.status.value == "active":
                user.last_login_at = datetime.utcnow()
                await db.flush()
                return user

    return None