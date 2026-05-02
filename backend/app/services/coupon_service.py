"""
Call20 — Coupon Service Layer (PRD v7.1)
Handles all coupon CRUD, redemption, and bulk generation logic.
"""
import uuid
import json
from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.coupon import Coupon, CouponRedemption, CouponStatus
from app.models.wallet_transaction import WalletTransaction, TransactionType, TransactionSource
from app.models.audit_log import AuditLog
from app.core.config import get_settings

settings = get_settings()


class CouponServiceError(Exception):
    """Base error for coupon operations"""
    def __init__(self, message: str, code: str = "COUPON_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class CouponService:
    """Service for coupon management and redemption"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── Admin: Create Single Coupon ──────────────────────────────

    async def create_coupon(
        self,
        code: str,
        credit_amount_usd: float,
        max_redemptions: int = 1,
        expiry_date: Optional[date] = None,
        tenant_id: Optional[uuid.UUID] = None,
        created_by: Optional[uuid.UUID] = None,
    ) -> Coupon:
        """Create a single coupon"""
        coupon = Coupon(
            code=code.upper(),
            credit_amount_usd=credit_amount_usd,
            max_redemptions=max_redemptions,
            expiry_date=expiry_date,
            tenant_id=tenant_id,
            status=CouponStatus.ACTIVE,
            created_by=created_by or uuid.UUID(int=0),  # system admin
        )
        self.db.add(coupon)
        await self.db.flush()

        # Audit log
        audit = AuditLog(
            action="coupon.created",
            resource_type="coupon",
            resource_id=coupon.id,
            details_json={
                "code": coupon.code,
                "credit_amount_usd": credit_amount_usd,
                "max_redemptions": max_redemptions,
                "expiry_date": str(expiry_date) if expiry_date else None,
            },
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(coupon)
        return coupon

    # ─── Admin: Bulk Generate Coupons ─────────────────────────────

    async def bulk_create_coupons(
        self,
        base_code: str,
        count: int,
        credit_amount_usd: float,
        expiry_date: Optional[date] = None,
        created_by: Optional[uuid.UUID] = None,
    ) -> List[Coupon]:
        """Generate N coupons with sequential codes (e.g., PROMO001–PROMO500)"""
        coupons = []
        for i in range(1, count + 1):
            suffix = str(i).zfill(3)  # 001, 002, ...
            code = f"{base_code.upper()}{suffix}"
            coupon = Coupon(
                code=code,
                credit_amount_usd=credit_amount_usd,
                max_redemptions=1,  # each coupon is single-use
                expiry_date=expiry_date,
                status=CouponStatus.ACTIVE,
                created_by=created_by or uuid.UUID(int=0),
            )
            self.db.add(coupon)
            coupons.append(coupon)

        await self.db.flush()

        # Audit log
        audit = AuditLog(
            action="coupon.bulk_created",
            resource_type="coupon",
            details_json={
                "base_code": base_code.upper(),
                "count": count,
                "credit_amount_usd": credit_amount_usd,
                "expiry_date": str(expiry_date) if expiry_date else None,
            },
        )
        self.db.add(audit)
        await self.db.commit()

        for c in coupons:
            await self.db.refresh(c)
        return coupons

    # ─── Admin: Update Coupon ─────────────────────────────────────

    async def update_coupon(
        self,
        coupon_id: uuid.UUID,
        credit_amount_usd: Optional[float] = None,
        max_redemptions: Optional[int] = None,
        expiry_date: Optional[date] = None,
        status: Optional[CouponStatus] = None,
        updated_by: Optional[uuid.UUID] = None,
    ) -> Coupon:
        """Update a coupon (cannot change code)"""
        result = await self.db.execute(
            select(Coupon).where(Coupon.id == coupon_id)
        )
        coupon = result.scalar_one_or_none()
        if not coupon:
            raise CouponServiceError("Coupon not found", code="COUPON_NOT_FOUND")

        changes = {}
        if credit_amount_usd is not None:
            coupon.credit_amount_usd = credit_amount_usd
            changes["credit_amount_usd"] = credit_amount_usd
        if max_redemptions is not None:
            coupon.max_redemptions = max_redemptions
            changes["max_redemptions"] = max_redemptions
        if expiry_date is not None:
            coupon.expiry_date = expiry_date
            changes["expiry_date"] = str(expiry_date)
        if status is not None:
            coupon.status = status
            changes["status"] = status.value

        coupon.updated_at = datetime.utcnow()

        # Audit log
        audit = AuditLog(
            action="coupon.updated",
            resource_type="coupon",
            resource_id=coupon.id,
            details_json=changes,
        )
        self.db.add(audit)
        await self.db.commit()
        await self.db.refresh(coupon)
        return coupon

    # ─── Admin: List Coupons ──────────────────────────────────────

    async def list_coupons(
        self,
        status: Optional[CouponStatus] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Coupon], int]:
        """List coupons with optional status filter"""
        query = select(Coupon)
        if status:
            query = query.where(Coupon.status == status)

        # Count total
        count_query = select(func.count()).select_from(Coupon)
        if status:
            count_query = count_query.where(Coupon.status == status)
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Paginated results
        query = query.order_by(Coupon.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        coupons = list(result.scalars().all())
        return coupons, total or 0

    # ─── Admin: Get Coupon with Redemptions ───────────────────────

    async def get_coupon_with_redemptions(self, coupon_id: uuid.UUID) -> Optional[Coupon]:
        """Get a single coupon with its redemption history"""
        result = await self.db.execute(
            select(Coupon).where(Coupon.id == coupon_id)
        )
        return result.scalar_one_or_none()

    # ─── Tenant: Redeem Coupon ────────────────────────────────────

    async def redeem_coupon(
        self,
        code: str,
        tenant_id: uuid.UUID,
        wallet_balance: float,
    ) -> Tuple[bool, str, Optional[float], Optional[float]]:
        """
        Redeem a coupon for a tenant.
        Returns: (success, message, credit_applied, new_balance)
        """
        code = code.upper().strip()

        # 1. Find the coupon
        result = await self.db.execute(
            select(Coupon).where(Coupon.code == code)
        )
        coupon = result.scalar_one_or_none()
        if not coupon:
            return False, "Invalid code", None, None

        # 2. Check status
        if coupon.status == CouponStatus.DISABLED:
            return False, "Code disabled", None, None

        # 3. Check expiry
        if coupon.expiry_date and date.today() > coupon.expiry_date:
            return False, "Code expired", None, None

        # 4. Check tenant restriction
        if coupon.tenant_id and coupon.tenant_id != tenant_id:
            return False, "Invalid code", None, None

        # 5. Check if tenant already redeemed (anti-stacking)
        redemption_check = await self.db.execute(
            select(CouponRedemption).where(CouponRedemption.tenant_id == tenant_id)
        )
        existing_redemptions = redemption_check.scalars().all()
        if existing_redemptions and not settings.ALLOW_COUPON_STACKING:
            return False, "You have already redeemed a coupon. Only one coupon per account is allowed.", None, None

        # 6. Check max redemptions
        if coupon.used_count >= coupon.max_redemptions:
            return False, "No redemptions remaining", None, None

        # 7. Apply credit
        credit_applied = coupon.credit_amount_usd
        new_balance = wallet_balance + credit_applied

        # Create wallet transaction
        transaction = WalletTransaction(
            tenant_id=tenant_id,
            amount=credit_applied,
            type=TransactionType.COUPON_REDEMPTION,
            source=TransactionSource.COUPON,
            balance_after=new_balance,
            description=f"Coupon redemption: {code}",
        )
        self.db.add(transaction)

        # Create redemption record
        redemption = CouponRedemption(
            coupon_id=coupon.id,
            tenant_id=tenant_id,
            credit_applied=credit_applied,
        )
        self.db.add(redemption)

        # Increment used_count
        coupon.used_count += 1

        # Auto-disable if exhausted
        if coupon.used_count >= coupon.max_redemptions:
            coupon.status = CouponStatus.EXPIRED

        # Audit log
        audit = AuditLog(
            tenant_id=tenant_id,
            action="coupon.redeemed",
            resource_type="coupon",
            resource_id=coupon.id,
            details_json={
                "code": code,
                "credit_applied": credit_applied,
                "new_balance": new_balance,
            },
        )
        self.db.add(audit)

        await self.db.commit()
        return True, "Coupon redeemed successfully", credit_applied, new_balance

    # ─── Onboarding: Apply Free Trial Credit ──────────────────────

    async def apply_free_trial_credit(
        self,
        tenant_id: uuid.UUID,
        wallet_balance: float,
        amount: Optional[float] = None,
    ) -> Tuple[float, float]:
        """
        Apply free trial credit to a new tenant's wallet.
        Returns: (credit_applied, new_balance)
        """
        credit_amount = amount or settings.DEFAULT_FREE_TRIAL_AMOUNT
        new_balance = wallet_balance + credit_amount

        transaction = WalletTransaction(
            tenant_id=tenant_id,
            amount=credit_amount,
            type=TransactionType.FREE_TRIAL,
            source=TransactionSource.FREE_TRIAL,
            balance_after=new_balance,
            description="Free trial credit",
        )
        self.db.add(transaction)

        # Audit log
        audit = AuditLog(
            tenant_id=tenant_id,
            action="free_trial.applied",
            resource_type="tenant",
            resource_id=tenant_id,
            details_json={
                "credit_amount": credit_amount,
                "new_balance": new_balance,
            },
        )
        self.db.add(audit)

        await self.db.commit()
        return credit_amount, new_balance

    # ─── Admin: Manual Wallet Credit ──────────────────────────────

    async def manual_wallet_credit(
        self,
        tenant_id: uuid.UUID,
        amount: float,
        description: str,
        admin_user_id: uuid.UUID,
    ) -> float:
        """Admin manually credits a tenant's wallet (with audit log)"""
        # Get current balance
        result = await self.db.execute(
            select(func.coalesce(func.sum(WalletTransaction.amount), 0))
            .where(WalletTransaction.tenant_id == tenant_id)
        )
        current_balance = result.scalar() or 0.0

        new_balance = current_balance + amount

        transaction = WalletTransaction(
            tenant_id=tenant_id,
            amount=amount,
            type=TransactionType.MANUAL_ADJUSTMENT,
            source=TransactionSource.MANUAL,
            balance_after=new_balance,
            description=description,
        )
        self.db.add(transaction)

        # Audit log
        audit = AuditLog(
            tenant_id=tenant_id,
            user_id=admin_user_id,
            action="wallet.manual_credit",
            resource_type="wallet_transaction",
            details_json={
                "amount": amount,
                "description": description,
                "new_balance": new_balance,
            },
        )
        self.db.add(audit)

        await self.db.commit()
        return new_balance