"""
Call20 — Auth API (Phase 1)
Registration, login, email verification, 2FA, password management.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth_service import (
    get_current_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
    generate_totp_secret,
    generate_totp_uri,
    verify_totp_token,
    require_role,
)
from app.services.tenant_service import register_tenant, verify_email, login_user
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    VerifyEmailRequest,
    TwoFASetupRequest,
    TwoFAVerifyRequest,
    ChangePasswordRequest,
    UserResponse,
)
from app.models.tenant import User, Tenant

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new tenant and owner account."""
    tenant, user, verification_token = await register_tenant(
        db=db,
        business_name=request.business_name,
        business_email=request.business_email,
        password=request.password,
        full_name=request.full_name,
        country=request.country,
        phone_number=request.phone_number,
        business_category=request.business_category,
    )
    await db.commit()

    # In production, send verification email
    # await send_verification_email.delay(request.business_email, verification_token)

    return {
        "message": "Registration successful. Please check your email to verify your account.",
        "tenant_id": str(tenant.id),
        "user_id": str(user.id),
    }


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and receive JWT tokens."""
    user, access_token, refresh_token = await login_user(
        db=db, email=request.email, password=request.password
    )
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh an access token using a refresh token."""
    payload = decode_token(request.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid refresh token")

    user_id = uuid.UUID(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get tenant_id and role
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one_or_none()

    access_token = create_access_token(user.id, user.tenant_id, user.role.value)
    new_refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )


@router.post("/verify-email")
async def verify_email_endpoint(request: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    """Verify email address using the token from the verification email."""
    user = await verify_email(db=db, token=request.token)
    await db.commit()

    return {"message": "Email verified successfully. You can now log in."}


@router.post("/2fa/setup")
async def setup_2fa(
    request: TwoFASetupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set up 2FA. Returns the TOTP secret and provisioning URI."""
    # Check if already set up
    if current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")

    # Generate secret
    secret = generate_totp_secret()
    uri = generate_totp_uri(secret, current_user.email, "Call20")

    # Store secret temporarily (user must verify before enabling)
    current_user.two_factor_secret = secret
    await db.commit()

    return {
        "secret": secret,
        "provisioning_uri": uri,
        "message": "Scan the QR code with your authenticator app and enter the 6-digit code to confirm.",
    }


@router.post("/2fa/enable")
async def enable_2fa(
    request: TwoFAVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Enable 2FA after verifying the TOTP token."""
    if not current_user.two_factor_secret:
        raise HTTPException(status_code=400, detail="Please set up 2FA first")

    if not verify_totp_token(current_user.two_factor_secret, request.token):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    current_user.two_factor_enabled = True
    await db.commit()

    return {"message": "Two-factor authentication enabled successfully."}


@router.post("/2fa/disable")
async def disable_2fa(
    request: TwoFAVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disable 2FA by verifying the current TOTP token."""
    if not current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled")

    if not verify_totp_token(current_user.two_factor_secret, request.token):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    current_user.two_factor_enabled = False
    current_user.two_factor_secret = None
    await db.commit()

    return {"message": "Two-factor authentication disabled."}


@router.post("/2fa/verify")
async def verify_2fa_login(
    request: TwoFAVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify 2FA token during login (returns tokens if valid)."""
    # This would be called after initial login if 2FA is enabled
    # The session would store the user_id temporarily
    pass


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change the user's password."""
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.password_hash = hash_password(request.new_password)
    await db.commit()

    return {"message": "Password changed successfully."}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current authenticated user's profile."""
    return current_user