"""
Call20 — Tenant & Team API (Phase 1)
Tenant profile management, team member invites, role management.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.services.auth_service import get_current_user, hash_password, require_role
from app.services.tenant_service import get_tenant_by_id
from app.schemas.auth import (
    TenantResponse,
    TenantUpdateRequest,
    UserResponse,
    InviteUserRequest,
    UpdateUserRoleRequest,
)
from app.models.tenant import Tenant, User, UserRole

router = APIRouter(prefix="/api/v1/tenants", tags=["Tenants"])


@router.get("/", response_model=TenantResponse)
async def get_my_tenant(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's tenant profile."""
    tenant = await get_tenant_by_id(db, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.patch("/", response_model=TenantResponse)
async def update_tenant(
    request: TenantUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update tenant profile."""
    tenant = await get_tenant_by_id(db, current_user.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    for key, value in request.model_dump().items():
        if value is not None:
            if key in ("elevenlabs_api_key", "cartesia_api_key"):
                # In production, encrypt before storing
                encrypted_key = f"enc_{value}"
                setattr(tenant, f"{key}_encrypted", encrypted_key)
            else:
                setattr(tenant, key, value)

    await db.commit()
    await db.refresh(tenant)
    return tenant


# ── Team Members ──────────────────────────────────────────────────────────────


@router.get("/members", response_model=list[UserResponse])
async def list_team_members(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all team members in the tenant."""
    result = await db.execute(
        select(User)
        .where(User.tenant_id == current_user.tenant_id, User.role != UserRole.API_KEY)
        .order_by(User.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/members/invite", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def invite_team_member(
    request: InviteUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Invite a new team member (Owner/Admin only)."""
    # Only Owner or Admin can invite
    if current_user.role not in (UserRole.OWNER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owners or admins can invite members")

    # Check if email already exists
    existing = await db.execute(
        select(User).where(User.email == request.email, User.tenant_id == current_user.tenant_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User already exists in this workspace")

    # Generate temporary password
    temp_password = uuid.uuid4().hex[:12]

    new_user = User(
        tenant_id=current_user.tenant_id,
        email=request.email,
        password_hash=hash_password(temp_password),
        full_name=request.full_name,
        role=UserRole(request.role),
        is_verified=False,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # In production, send invitation email with temp password
    # await send_invitation_email.delay(request.email, temp_password)

    return new_user


@router.put("/members/{user_id}/role", response_model=UserResponse)
async def update_member_role(
    user_id: uuid.UUID,
    request: UpdateUserRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a team member's role (Owner only)."""
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only the owner can change roles")

    target_user = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    target = target_user.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot change the owner's role
    if target.role == UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Cannot change the owner's role")

    target.role = UserRole(request.role)
    await db.commit()
    await db.refresh(target)
    return target


@router.delete("/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a team member (Owner only)."""
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only the owner can remove members")

    target_user = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == current_user.tenant_id)
    )
    target = target_user.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.role == UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Cannot remove the owner")

    if target.id == current_user.id:
        raise HTTPException(status_code=403, detail="Cannot remove yourself")

    await db.delete(target)
    await db.commit()