"""
Call20 — Credit Expiry Celery Job (PRD v7.1)
Daily job to expire free trial and coupon credits past their expiry period.
"""
import uuid
from datetime import datetime, timedelta
from typing import List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wallet_transaction import WalletTransaction, TransactionType, TransactionSource
from app.services.admin_settings_service import AdminSettingsService


async def expire_old_credits(db: AsyncSession) -> dict:
    """
    Daily Celery job: expire free trial and coupon credits past their expiry period.
    Returns summary of expired credits.
    """
    settings_service = AdminSettingsService(db)
    free_credit_settings = await settings_service.get_free_credit_settings()

    trial_expiry_days = free_credit_settings.get("free_trial_expiry_days", 45)
    coupon_expiry_days = free_credit_settings.get("coupon_credit_expiry_days", 45)

    cutoff_date = datetime.utcnow() - timedelta(days=trial_expiry_days)
    coupon_cutoff = datetime.utcnow() - timedelta(days=coupon_expiry_days)

    # Find all tenants with free trial credits older than expiry
    free_trial_txns = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.source == TransactionSource.FREE_TRIAL)
        .where(WalletTransaction.created_at < cutoff_date)
    )
    expired_free_trials = free_trial_txns.scalars().all()

    # Find all tenants with coupon credits older than expiry
    coupon_txns = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.source == TransactionSource.COUPON)
        .where(WalletTransaction.created_at < coupon_cutoff)
    )
    expired_coupons = coupon_txns.scalars().all()

    # Track which tenants we've already processed (to avoid duplicate expiry entries)
    processed_tenants: set = set()
    total_expired = 0.0

    for txn in expired_free_trials + expired_coupons:
        if txn.tenant_id in processed_tenants:
            continue
        processed_tenants.add(txn.tenant_id)

        # Calculate total expired credits for this tenant
        expired_amount = 0.0
        if txn.source == TransactionSource.FREE_TRIAL:
            # Sum all free trial credits for this tenant that are expired
            result = await db.execute(
                select(func.coalesce(func.sum(WalletTransaction.amount), 0))
                .where(WalletTransaction.tenant_id == txn.tenant_id)
                .where(WalletTransaction.source == TransactionSource.FREE_TRIAL)
                .where(WalletTransaction.created_at < cutoff_date)
            )
            expired_amount = result.scalar() or 0.0
        elif txn.source == TransactionSource.COUPON:
            result = await db.execute(
                select(func.coalesce(func.sum(WalletTransaction.amount), 0))
                .where(WalletTransaction.tenant_id == txn.tenant_id)
                .where(WalletTransaction.source == TransactionSource.COUPON)
                .where(WalletTransaction.created_at < coupon_cutoff)
            )
            expired_amount = result.scalar() or 0.0

        if expired_amount > 0:
            # Create expiry transaction (negative amount)
            expiry_txn = WalletTransaction(
                tenant_id=txn.tenant_id,
                amount=-expired_amount,
                type=TransactionType.CREDIT_EXPIRED,
                source=TransactionSource.EXPIRY,
                balance_after=0.0,  # will be recalculated
                description=f"Expired credits (trial: {txn.source == TransactionSource.FREE_TRIAL})",
            )
            db.add(expiry_txn)
            total_expired += expired_amount

    await db.commit()

    # Recalculate all balances
    await _recalculate_balances(db)

    return {
        "tenants_processed": len(processed_tenants),
        "total_expired_usd": round(total_expired, 2),
        "trial_expiry_days": trial_expiry_days,
        "coupon_expiry_days": coupon_expiry_days,
    }


async def _recalculate_balances(db: AsyncSession):
    """Recalculate balance_after for all wallet transactions (idempotent)"""
    result = await db.execute(
        select(WalletTransaction.tenant_id)
        .distinct()
    )
    tenant_ids = [row[0] for row in result.all()]

    for tenant_id in tenant_ids:
        txns = await db.execute(
            select(WalletTransaction)
            .where(WalletTransaction.tenant_id == tenant_id)
            .order_by(WalletTransaction.created_at)
        )
        running_balance = 0.0
        for txn in txns.scalars().all():
            running_balance += txn.amount
            txn.balance_after = round(running_balance, 2)

    await db.commit()