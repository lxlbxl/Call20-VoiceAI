"""
Call20 — Onboarding Service (PRD v7.1)
Handles free trial credit auto-application on tenant signup.
"""
import uuid
from typing import Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.wallet_transaction import WalletTransaction
from app.services.coupon_service import CouponService
from app.services.admin_settings_service import AdminSettingsService


async def apply_free_trial_on_signup(
    db: AsyncSession,
    tenant_id: uuid.UUID,
) -> Tuple[bool, float]:
    """
    Apply free trial credit to a new tenant's wallet if enabled.
    Returns: (was_applied, credit_amount)
    """
    settings_service = AdminSettingsService(db)
    free_credit_settings = await settings_service.get_free_credit_settings()

    # Check if free trial is enabled
    if not free_credit_settings.get("free_trial_enabled", True):
        return False, 0.0

    # Check if tenant already has free trial applied
    result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.tenant_id == tenant_id)
        .where(WalletTransaction.source == "free_trial")
        .limit(1)
    )
    if result.scalar_one_or_none():
        # Already applied
        return False, 0.0

    # Get current balance
    balance_result = await db.execute(
        select(func.coalesce(func.sum(WalletTransaction.amount), 0))
        .where(WalletTransaction.tenant_id == tenant_id)
    )
    current_balance = balance_result.scalar() or 0.0

    # Apply free trial credit
    credit_amount = free_credit_settings.get("free_trial_amount_usd", 10.00)
    coupon_service = CouponService(db)
    _, new_balance = await coupon_service.apply_free_trial_credit(
        tenant_id=tenant_id,
        wallet_balance=current_balance,
        amount=credit_amount,
    )

    return True, credit_amount