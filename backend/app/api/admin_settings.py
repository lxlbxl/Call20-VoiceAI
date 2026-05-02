"""
Call20 — Admin Settings API Routes (PRD v7.1)
Free credit settings management endpoints.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.admin_settings_service import AdminSettingsService
from app.schemas.coupon import FreeCreditSettings, AdminSettingResponse

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Settings"])


# ─── Helper: Admin Auth ───────────────────────────────────────────

async def verify_admin(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    """Simple admin key verification (replace with proper auth in production)"""
    from app.core.config import get_settings
    settings = get_settings()
    if x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return x_admin_key


# ─── Get Free Credit Settings ─────────────────────────────────────

@router.get("/settings/free-credits", response_model=FreeCreditSettings)
async def get_free_credit_settings(
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin),
):
    """Get all free credit settings"""
    service = AdminSettingsService(db)
    return await service.get_free_credit_settings()


# ─── Update Free Credit Settings ──────────────────────────────────

@router.patch("/settings/free-credits", response_model=FreeCreditSettings)
async def update_free_credit_settings(
    data: FreeCreditSettings,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin),
):
    """Update free credit settings (changes only affect new signups/redemptions)"""
    service = AdminSettingsService(db)
    updated = await service.update_free_credit_settings(
        free_trial_enabled=data.free_trial_enabled,
        free_trial_amount_usd=data.free_trial_amount_usd,
        free_trial_expiry_days=data.free_trial_expiry_days,
        coupon_credit_expiry_days=data.coupon_credit_expiry_days,
        allow_coupon_stacking=data.allow_coupon_stacking,
    )
    return updated


# ─── Get All Settings ─────────────────────────────────────────────

@router.get("/settings", response_model=list[AdminSettingResponse])
async def get_all_settings(
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin),
):
    """Get all admin settings"""
    service = AdminSettingsService(db)
    return await service.get_all_settings()