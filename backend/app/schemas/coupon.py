"""
Call20 — Coupon & Admin Settings Pydantic Schemas (PRD v7.1)
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


# ─── Coupon Schemas ───────────────────────────────────────────────

class CouponStatusEnum(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    DISABLED = "disabled"


class CouponCreate(BaseModel):
    """Admin creates a single coupon"""
    code: str = Field(..., min_length=3, max_length=50, description="Unique alphanumeric coupon code")
    credit_amount_usd: float = Field(..., gt=0, le=1000, description="Credit amount in USD")
    max_redemptions: int = Field(..., ge=1, le=100000, default=1)
    expiry_date: Optional[date] = Field(None, description="Optional expiry date")
    tenant_id: Optional[UUID] = Field(None, description="Optional: restrict to specific tenant")

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Code must be alphanumeric (hyphens and underscores allowed)")
        return v.upper()


class CouponUpdate(BaseModel):
    """Admin updates a coupon (cannot change code)"""
    credit_amount_usd: Optional[float] = Field(None, gt=0, le=1000)
    max_redemptions: Optional[int] = Field(None, ge=1, le=100000)
    expiry_date: Optional[date] = None
    status: Optional[CouponStatusEnum] = None


class CouponBulkCreate(BaseModel):
    """Admin bulk-generates N coupons"""
    base_code: str = Field(..., min_length=3, max_length=40)
    count: int = Field(..., ge=1, le=10000, description="Number of coupons to generate")
    credit_amount_usd: float = Field(..., gt=0, le=1000)
    expiry_date: Optional[date] = None


class CouponResponse(BaseModel):
    id: UUID
    code: str
    credit_amount_usd: float
    max_redemptions: int
    used_count: int
    expiry_date: Optional[date]
    tenant_id: Optional[UUID]
    status: CouponStatusEnum
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CouponWithRedemptions(CouponResponse):
    redemptions: List["CouponRedemptionResponse"] = []


class CouponRedemptionResponse(BaseModel):
    id: UUID
    coupon_id: UUID
    tenant_id: UUID
    redeemed_at: datetime
    credit_applied: float

    class Config:
        from_attributes = True


# ─── Coupon Redemption Schemas ────────────────────────────────────

class CouponRedeemRequest(BaseModel):
    """Tenant redeems a coupon"""
    code: str = Field(..., min_length=3, max_length=50)


class CouponRedeemResponse(BaseModel):
    success: bool
    message: str
    credit_applied: Optional[float] = None
    new_balance: Optional[float] = None


# ─── Admin Settings Schemas ───────────────────────────────────────

class FreeCreditSettings(BaseModel):
    """Admin free credit settings"""
    free_trial_enabled: bool = True
    free_trial_amount_usd: float = Field(default=10.00, gt=0, le=1000)
    free_trial_expiry_days: int = Field(default=45, ge=1, le=365)
    coupon_credit_expiry_days: int = Field(default=45, ge=1, le=365)
    allow_coupon_stacking: bool = False


class AdminSettingUpdate(BaseModel):
    key: str
    value: str  # JSON-serialized


class AdminSettingResponse(BaseModel):
    id: UUID
    key: str
    value: str
    updated_at: datetime
    updated_by: Optional[UUID]

    class Config:
        from_attributes = True


# ─── Wallet Transaction Schemas ───────────────────────────────────

class WalletTransactionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    call_id: Optional[UUID]
    amount: float
    type: str
    source: str
    balance_after: float
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class WalletBalanceResponse(BaseModel):
    balance: float
    available_balance: float  # excludes expired credits
    free_credits_applied: bool
    coupon_redeemed: bool
    pending_credits: float  # credits not yet expired