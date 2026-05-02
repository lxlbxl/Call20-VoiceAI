"""
Call20 — Tenant Onboarding Service (Phase 1)
Handles tenant registration, email verification, and initial setup.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.tenant import Tenant, User, AgentConfig, DID, PlanType, TenantStatus, UserRole
from app.services.auth_service import hash_password, generate_verification_token
from app.core.config import settings


async def register_tenant(
    db: AsyncSession,
    business_name: str,
    business_email: str,
    password: str,
    full_name: str,
    country: str,
    phone_number: Optional[str] = None,
    business_category: Optional[str] = None,
) -> tuple[Tenant, User, str]:
    """
    Register a new tenant and create the owner user account.
    Returns (tenant, user, verification_token).
    """
    # Check if email already exists
    result = await db.execute(select(Tenant).where(Tenant.business_email == business_email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A tenant with this email already exists.",
        )

    verification_token = generate_verification_token()

    # Create tenant
    tenant = Tenant(
        name=business_name,
        business_email=business_email,
        phone_number=phone_number,
        country=country,
        business_category=business_category,
        plan=PlanType.STARTER,
        wallet_balance=0.0,
        status=TenantStatus.PENDING_VERIFICATION,
        free_credits_applied=False,
        coupon_redeemed=False,
    )
    db.add(tenant)
    await db.flush()

    # Create owner user
    user = User(
        tenant_id=tenant.id,
        email=business_email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=UserRole.OWNER,
        is_verified=False,
        verification_token=verification_token,
    )
    db.add(user)

    # Create default agent config
    default_agent = AgentConfig(
        tenant_id=tenant.id,
        name="Default Agent",
        persona_prompt=(
            f"You are a helpful AI assistant for {business_name}. "
            f"Answer questions professionally and help callers with their inquiries. "
            f"If you cannot help, offer to take a message or transfer to a human."
        ),
        greeting_message=f"Thank you for calling {business_name}. How can I help you today?",
        language="en-NG",
        voice_engine="cartesia",
        tools_enabled=["send_sms", "book_appointment", "transfer_call"],
        knowledge_base_ids=[],
        after_hours_behavior="voicemail",
        max_call_duration_seconds=600,
        sentiment_handoff_threshold=0.3,
        recording_enabled=True,
        pii_redaction_enabled=True,
    )
    db.add(default_agent)

    return tenant, user, verification_token


async def verify_email(db: AsyncSession, token: str) -> User:
    """Verify a user's email using the verification token."""
    result = await db.execute(select(User).where(User.verification_token == token))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid verification token")

    user.is_verified = True
    user.verification_token = None

    # Activate tenant
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if tenant:
        tenant.status = TenantStatus.ACTIVE

    return user


async def login_user(db: AsyncSession, email: str, password: str) -> tuple[User, str, str]:
    """Authenticate a user and return (user, access_token, refresh_token)."""
    from app.services.auth_service import verify_password, create_access_token, create_refresh_token

    # Find user by email
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in.",
        )

    # Check tenant status
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant or tenant.status.value != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not active. Please contact support.",
        )

    # Update last login
    user.last_login_at = datetime.utcnow()

    access_token = create_access_token(user.id, user.tenant_id, user.role.value)
    refresh_token = create_refresh_token(user.id)

    return user, access_token, refresh_token


async def get_tenant_by_id(db: AsyncSession, tenant_id: uuid.UUID) -> Optional[Tenant]:
    """Get a tenant by ID."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    return result.scalar_one_or_none()


async def get_tenant_did_count(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Get the number of DIDs for a tenant."""
    result = await db.execute(
        select(func.count(DID.id)).where(DID.tenant_id == tenant_id)
    )
    return result.scalar() or 0


async def get_tenant_agent_count(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Get the number of agent configs for a tenant."""
    result = await db.execute(
        select(func.count(AgentConfig.id)).where(AgentConfig.tenant_id == tenant_id)
    )
    return result.scalar() or 0


async def check_plan_limit(db: AsyncSession, tenant_id: uuid.UUID, resource: str) -> bool:
    """
    Check if a tenant has reached their plan limit for a resource.
    Returns True if within limits, False if exceeded.
    """
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        return False

    limits = {
        "dids": {"starter": 1, "growth": 3, "scale": 10, "enterprise": 99999},
        "agents": {"starter": 1, "growth": 3, "scale": 10, "enterprise": 99999},
        "kb_pages": {"starter": 50, "growth": 200, "scale": 99999, "enterprise": 99999},
        "webhooks": {"starter": 0, "growth": 5, "scale": 5, "enterprise": 5},
    }

    if resource not in limits:
        return True

    plan_limits = limits[resource]
    max_count = plan_limits.get(tenant.plan.value, 1)

    if resource == "dids":
        current = await get_tenant_did_count(db, tenant_id)
    elif resource == "agents":
        current = await get_tenant_agent_count(db, tenant_id)
    else:
        return True

    return current < max_count