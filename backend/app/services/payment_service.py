"""
Call20 — Payment Service (Phase 4)
Handles wallet top-ups via Paystack and Flutterwave.
"""
import os
import uuid
import httpx
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.tenant import Tenant, TenantStatus
from app.models.wallet_transaction import WalletTransaction, TransactionType
from app.models.coupon import Coupon, CouponType

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
FLUTTERWAVE_SECRET_KEY = os.getenv("FLUTTERWAVE_SECRET_KEY", "")
PAYSTACK_BASE_URL = "https://api.paystack.co"
FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3"


# ── Paystack Integration ──────────────────────────────────────────────────────

async def create_paystack_payment(
    tenant_id: uuid.UUID,
    amount_usd: float,
    email: str,
    reference: str,
) -> dict:
    """
    Create a Paystack payment page for wallet top-up.
    Returns authorization_url for redirect.
    """
    # Convert USD to NGN (use fixed rate or fetch from API)
    # In production, use real-time exchange rate
    exchange_rate = float(os.getenv("USD_TO_NGN_RATE", "1500"))
    amount_naira = int(amount_usd * exchange_rate)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{PAYSTACK_BASE_URL}/transaction/initialize",
            headers={
                "Authorization": f"Bearer {PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "email": email,
                "amount": amount_naira * 100,  # Paystack uses kobo
                "currency": "NGN",
                "reference": reference,
                "callback_url": f"{os.getenv('CALL20_FRONTEND_URL', '')}/payment/callback",
                "metadata": {
                    "tenant_id": str(tenant_id),
                    "amount_usd": amount_usd,
                    "type": "wallet_topup",
                },
            },
        )
        response.raise_for_status()
        data = response.json()
        return {
            "authorization_url": data["data"]["authorization_url"],
            "reference": reference,
        }


async def verify_paystack_payment(reference: str) -> dict:
    """Verify a Paystack payment."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
        )
        response.raise_for_status()
        return response.json()


# ── Flutterwave Integration ───────────────────────────────────────────────────

async def create_flutterwave_payment(
    tenant_id: uuid.UUID,
    amount_usd: float,
    email: str,
    reference: str,
) -> dict:
    """
    Create a Flutterwave payment for wallet top-up.
    Returns link for redirect.
    """
    exchange_rate = float(os.getenv("USD_TO_NGN_RATE", "1500"))
    amount_naira = round(amount_usd * exchange_rate, 2)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{FLUTTERWAVE_BASE_URL}/payments",
            headers={
                "Authorization": f"Bearer {FLUTTERWAVE_SECRET_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "tx_ref": reference,
                "amount": amount_naira,
                "currency": "NGN",
                "email": email,
                "redirect_url": f"{os.getenv('CALL20_FRONTEND_URL', '')}/payment/callback",
                "meta": {
                    "tenant_id": str(tenant_id),
                    "amount_usd": amount_usd,
                    "type": "wallet_topup",
                },
                "customizations": {
                    "title": "Call20 Wallet Top-up",
                    "description": f"Top-up ${amount_usd:.2f}",
                },
            },
        )
        response.raise_for_status()
        data = response.json()
        return {
            "link": data["data"]["link"],
            "reference": reference,
        }


async def verify_flutterwave_payment(reference: str) -> dict:
    """Verify a Flutterwave payment."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{FLUTTERWAVE_BASE_URL}/transactions/{reference}/verify",
            headers={"Authorization": f"Bearer {FLUTTERWAVE_SECRET_KEY}"},
        )
        response.raise_for_status()
        return response.json()


# ── Wallet Top-up ─────────────────────────────────────────────────────────────

async def process_wallet_topup(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    amount_usd: float,
    payment_reference: str,
    payment_provider: str,
) -> WalletTransaction:
    """
    Process a verified wallet top-up.
    Creates wallet transaction and credits tenant.
    """
    # Verify tenant exists and is active
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise ValueError("Tenant not found")
    if tenant.status != TenantStatus.ACTIVE:
        raise ValueError("Tenant is not active")

    # Create transaction record
    transaction = WalletTransaction(
        tenant_id=tenant_id,
        type=TransactionType.CREDIT,
        amount=amount_usd,
        balance_before=tenant.wallet_balance,
        balance_after=float(Decimal(str(tenant.wallet_balance)) + Decimal(str(amount_usd))),
        description=f"Wallet top-up via {payment_provider}",
        reference=payment_reference,
    )
    db.add(transaction)

    # Update tenant wallet
    tenant.wallet_balance = float(Decimal(str(tenant.wallet_balance)) + Decimal(str(amount_usd)))
    await db.flush()

    return transaction


# ── Call Cost Deduction ───────────────────────────────────────────────────────

async def deduct_call_cost(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    cost_usd: float,
    call_id: uuid.UUID,
) -> bool:
    """
    Deduct call cost from tenant wallet.
    Returns True if successful, False if insufficient balance.
    """
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        return False

    current_balance = float(tenant.wallet_balance)
    if current_balance < cost_usd:
        return False

    # Create deduction transaction
    transaction = WalletTransaction(
        tenant_id=tenant_id,
        type=TransactionType.DEBIT,
        amount=-cost_usd,
        balance_before=current_balance,
        balance_after=float(Decimal(str(current_balance)) - Decimal(str(cost_usd))),
        description=f"Call cost (call_id: {call_id})",
        reference=str(call_id),
    )
    db.add(transaction)

    # Update wallet
    tenant.wallet_balance = float(Decimal(str(current_balance)) - Decimal(str(cost_usd)))
    await db.flush()

    return True


# ── Coupon Redemption ─────────────────────────────────────────────────────────

async def redeem_coupon(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    coupon_code: str,
) -> dict:
    """
    Redeem a coupon code for wallet credit or plan discount.
    """
    # Find coupon
    result = await db.execute(
        select(Coupon).where(
            Coupon.code == coupon_code.upper(),
            Coupon.active == True,
        )
    )
    coupon = result.scalar_one_or_none()
    if not coupon:
        return {"success": False, "message": "Invalid coupon code"}

    # Check expiry
    if coupon.expires_at and coupon.expires_at < datetime.utcnow():
        return {"success": False, "message": "Coupon has expired"}

    # Check max uses
    if coupon.uses_count >= coupon.max_uses:
        return {"success": False, "message": "Coupon has reached maximum uses"}

    # Check if already used by this tenant
    used_result = await db.execute(
        select(WalletTransaction).where(
            WalletTransaction.tenant_id == tenant_id,
            WalletTransaction.reference == f"coupon:{coupon_code.upper()}",
        )
    )
    if used_result.scalar_one_or_none():
        return {"success": False, "message": "Coupon already used"}

    # Get tenant
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        return {"success": False, "message": "Tenant not found"}

    # Apply coupon
    if coupon.coupon_type == CouponType.FIXED_AMOUNT:
        credit_amount = coupon.value
    elif coupon.coupon_type == CouponType.PERCENTAGE:
        # Percentage of a default top-up amount (e.g., $50)
        credit_amount = 50.0 * (coupon.value / 100)
    else:
        return {"success": False, "message": "Invalid coupon type"}

    # Create credit transaction
    transaction = WalletTransaction(
        tenant_id=tenant_id,
        type=TransactionType.CREDIT,
        amount=credit_amount,
        balance_before=tenant.wallet_balance,
        balance_after=float(Decimal(str(tenant.wallet_balance)) + Decimal(str(credit_amount))),
        description=f"Coupon credit: {coupon_code.upper()}",
        reference=f"coupon:{coupon_code.upper()}",
    )
    db.add(transaction)

    # Update wallet
    tenant.wallet_balance = float(Decimal(str(tenant.wallet_balance)) + Decimal(str(credit_amount)))

    # Update coupon usage
    coupon.uses_count += 1
    await db.flush()

    return {
        "success": True,
        "message": f"Coupon redeemed! ${credit_amount:.2f} credited to your wallet.",
        "amount": round(credit_amount, 2),
    }


# ── Credit Expiry ─────────────────────────────────────────────────────────────

async def expire_old_credits(db: AsyncSession) -> int:
    """
    Expire credits older than 1 year.
    Returns number of expired transactions.
    """
    one_year_ago = datetime.utcnow() - timedelta(days=365)

    result = await db.execute(
        select(WalletTransaction).where(
            WalletTransaction.type == TransactionType.CREDIT,
            WalletTransaction.created_at < one_year_ago,
            WalletTransaction.expired == False,
        )
    )
    old_credits = list(result.scalars().all())

    for credit in old_credits:
        credit.expired = True
        # Deduct from wallet
        tenant_result = await db.execute(
            select(Tenant).where(Tenant.id == credit.tenant_id)
        )
        tenant = tenant_result.scalar_one_or_none()
        if tenant:
            current = Decimal(str(tenant.wallet_balance))
            deduction = Decimal(str(abs(credit.amount)))
            tenant.wallet_balance = float(max(Decimal("0"), current - deduction))

    await db.flush()
    return len(old_credits)