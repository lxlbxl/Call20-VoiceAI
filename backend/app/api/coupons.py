"""
Call20 — Coupon API Routes (PRD v7.1)
Admin CRUD + Tenant redemption endpoints.
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.services.coupon_service import CouponService, CouponServiceError
from app.services.admin_settings_service import AdminSettingsService
from app.schemas.coupon import (
    CouponCreate,
    CouponUpdate,
    CouponBulkCreate,
    CouponResponse,
    CouponWithRedemptions,
    CouponRedemptionResponse,
    CouponRedeemRequest,
    CouponRedeemResponse,
)
from app.models.coupon import Coupon, CouponStatus

router = APIRouter(prefix="/api/v1", tags=["Coupons"])


# ─── Helper: Admin Auth ───────────────────────────────────────────

async def verify_admin(x_admin_key: str = Header(..., alias="X-Admin-Key")):
    """Simple admin key verification (replace with proper auth in production)"""
    from app.core.config import get_settings
    settings = get_settings()
    if x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return x_admin_key


# ─── Admin: Create Single Coupon ──────────────────────────────────

@router.post("/admin/coupons", response_model=CouponResponse, status_code=201)
async def admin_create_coupon(
    data: CouponCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin),
):
    """Create a single promotional coupon"""
    service = CouponService(db)
    try:
        coupon = await service.create_coupon(
            code=data.code,
            credit_amount_usd=data.credit_amount_usd,
            max_redemptions=data.max_redemptions,
            expiry_date=data.expiry_date,
            tenant_id=data.tenant_id,
        )
        return coupon
    except CouponServiceError as e:
        raise HTTPException(status_code=400, detail=e.message)


# ─── Admin: Bulk Generate Coupons ─────────────────────────────────

@router.post("/admin/coupons/bulk", response_model=list[CouponResponse], status_code=201)
async def admin_bulk_create_coupons(
    data: CouponBulkCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin),
):
    """Bulk-generate N coupons with sequential codes"""
    service = CouponService(db)
    try:
        coupons = await service.bulk_create_coupons(
            base_code=data.base_code,
            count=data.count,
            credit_amount_usd=data.credit_amount_usd,
            expiry_date=data.expiry_date,
        )
        return coupons
    except CouponServiceError as e:
        raise HTTPException(status_code=400, detail=e.message)


# ─── Admin: List Coupons ──────────────────────────────────────────

@router.get("/admin/coupons", response_model=dict)
async def admin_list_coupons(
    status: Optional[str] = Query(None, description="Filter by status: active, expired, disabled"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin),
):
    """List all coupons with pagination"""
    service = CouponService(db)
    coupon_status = CouponStatus(status) if status else None
    coupons, total = await service.list_coupons(status=coupon_status, limit=limit, offset=offset)
    return {
        "coupons": coupons,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# ─── Admin: Get Coupon with Redemptions ───────────────────────────

@router.get("/admin/coupons/{coupon_id}", response_model=CouponWithRedemptions)
async def admin_get_coupon(
    coupon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin),
):
    """Get a single coupon with its redemption history"""
    service = CouponService(db)
    coupon = await service.get_coupon_with_redemptions(coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon


# ─── Admin: Update Coupon ─────────────────────────────────────────

@router.patch("/admin/coupons/{coupon_id}", response_model=CouponResponse)
async def admin_update_coupon(
    coupon_id: uuid.UUID,
    data: CouponUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(verify_admin),
):
    """Update a coupon (cannot change code)"""
    service = CouponService(db)
    try:
        coupon = await service.update_coupon(
            coupon_id=coupon_id,
            credit_amount_usd=data.credit_amount_usd,
            max_redemptions=data.max_redemptions,
            expiry_date=data.expiry_date,
            status=CouponStatus(data.status) if data.status else None,
        )
        return coupon
    except CouponServiceError as e:
        if e.code == "COUPON_NOT_FOUND":
            raise HTTPException(status_code=404, detail=e.message)
        raise HTTPException(status_code=400, detail=e.message)


# ─── Tenant: Redeem Coupon ────────────────────────────────────────

@router.post("/coupons/redeem", response_model=CouponRedeemResponse)
async def tenant_redeem_coupon(
    data: CouponRedeemRequest,
    db: AsyncSession = Depends(get_db),
    x_tenant_id: uuid.UUID = Header(..., alias="X-Tenant-ID"),
):
    """Tenant redeems a coupon code"""
    service = CouponService(db)

    # Get tenant's current wallet balance
    from app.models.wallet_transaction import WalletTransaction
    from sqlalchemy import func
    result = await db.execute(
        select(func.coalesce(func.sum(WalletTransaction.amount), 0))
        .where(WalletTransaction.tenant_id == x_tenant_id)
    )
    wallet_balance = result.scalar() or 0.0

    success, message, credit_applied, new_balance = await service.redeem_coupon(
        code=data.code,
        tenant_id=x_tenant_id,
        wallet_balance=wallet_balance,
    )

    return CouponRedeemResponse(
        success=success,
        message=message,
        credit_applied=credit_applied,
        new_balance=new_balance,
    )


# ─── Tenant: Check Coupon Status ──────────────────────────────────

@router.get("/coupons/check/{code}")
async def tenant_check_coupon(
    code: str,
    db: AsyncSession = Depends(get_db),
):
    """Check if a coupon code is valid (without redeeming)"""
    code = code.upper().strip()
    result = await db.execute(select(Coupon).where(Coupon.code == code))
    coupon = result.scalar_one_or_none()

    if not coupon:
        return {"valid": False, "message": "Invalid code"}

    if coupon.status == CouponStatus.DISABLED:
        return {"valid": False, "message": "Code disabled"}

    if coupon.expiry_date and coupon.expiry_date < __import__("datetime").date.today():
        return {"valid": False, "message": "Code expired"}

    if coupon.used_count >= coupon.max_redemptions:
        return {"valid": False, "message": "No redemptions remaining"}

    return {
        "valid": True,
        "code": coupon.code,
        "credit_amount_usd": coupon.credit_amount_usd,
        "remaining_redemptions": coupon.max_redemptions - coupon.used_count,
    }