"""
Call20 — Payment API (Phase 4)
Wallet top-up, coupon redemption, and payment webhooks.
"""
import uuid
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.models.tenant import Tenant, User
from app.models.wallet_transaction import WalletTransaction, TransactionType
from app.services.payment_service import (
    create_paystack_payment,
    create_flutterwave_payment,
    verify_paystack_payment,
    verify_flutterwave_payment,
    process_wallet_topup,
    redeem_coupon,
)

router = APIRouter(prefix="/api/v1/payments", tags=["Payments"])


# ── Wallet Top-up ─────────────────────────────────────────────────────────────

@router.post("/topup/initiate")
async def initiate_topup(
    provider: str,
    amount_usd: float,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Initiate a wallet top-up via Paystack or Flutterwave.
    Returns payment URL for redirect.
    """
    if amount_usd < 5:
        raise HTTPException(status_code=400, detail="Minimum top-up amount is $5")

    if provider not in ["paystack", "flutterwave"]:
        raise HTTPException(status_code=400, detail="Provider must be 'paystack' or 'flutterwave'")

    # Get tenant
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Generate unique reference
    reference = f"call20_{uuid.uuid4().hex[:16]}"

    if provider == "paystack":
        payment_data = await create_paystack_payment(
            tenant_id=tenant.id,
            amount_usd=amount_usd,
            email=current_user.email,
            reference=reference,
        )
    else:
        payment_data = await create_flutterwave_payment(
            tenant_id=tenant.id,
            amount_usd=amount_usd,
            email=current_user.email,
            reference=reference,
        )

    return {
        "reference": reference,
        "payment_url": payment_data.get("authorization_url") or payment_data.get("link"),
        "amount_usd": amount_usd,
        "provider": provider,
    }


@router.post("/topup/verify/{reference}")
async def verify_topup(
    reference: str,
    provider: str = "paystack",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Verify a payment and credit the wallet.
    """
    if provider == "paystack":
        verification = await verify_paystack_payment(reference)
    else:
        verification = await verify_flutterwave_payment(reference)

    if verification.get("data", {}).get("status") not in ["success", "completed"]:
        raise HTTPException(status_code=400, detail="Payment not successful")

    # Extract metadata
    metadata = verification["data"].get("metadata", {})
    tenant_id = uuid.UUID(metadata.get("tenant_id", str(current_user.tenant_id)))
    amount_usd = float(metadata.get("amount_usd", 0))

    if amount_usd <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")

    # Process top-up
    transaction = await process_wallet_topup(
        db,
        tenant_id=tenant_id,
        amount_usd=amount_usd,
        payment_reference=reference,
        payment_provider=provider,
    )
    await db.commit()

    return {
        "success": True,
        "message": f"${amount_usd:.2f} credited to your wallet",
        "new_balance": str(transaction.balance_after),
    }


# ── Payment Webhook ───────────────────────────────────────────────────────────

@router.post("/webhook/paystack")
async def paystack_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Paystack webhook for payment verification.
    """
    payload = await request.json()
    event = payload.get("event")

    if event == "charge.success":
        data = payload.get("data", {})
        reference = data.get("reference")
        metadata = data.get("metadata", {})

        if metadata.get("type") == "wallet_topup":
            tenant_id = uuid.UUID(metadata.get("tenant_id"))
            amount_usd = float(metadata.get("amount_usd", 0))

            await process_wallet_topup(
                db,
                tenant_id=tenant_id,
                amount_usd=amount_usd,
                payment_reference=reference,
                payment_provider="paystack",
            )
            await db.commit()

    return {"status": "received"}


@router.post("/webhook/flutterwave")
async def flutterwave_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Flutterwave webhook for payment verification.
    """
    payload = await request.json()
    event = payload.get("event")

    if event == "charge.completed":
        data = payload.get("data", {})
        tx_ref = data.get("tx_ref")
        meta = data.get("meta", {})

        if meta.get("type") == "wallet_topup":
            tenant_id = uuid.UUID(meta.get("tenant_id"))
            amount_usd = float(meta.get("amount_usd", 0))

            await process_wallet_topup(
                db,
                tenant_id=tenant_id,
                amount_usd=amount_usd,
                payment_reference=tx_ref,
                payment_provider="flutterwave",
            )
            await db.commit()

    return {"status": "received"}


# ── Coupon Redemption ─────────────────────────────────────────────────────────

@router.post("/coupons/redeem")
async def redeem_coupon_endpoint(
    coupon_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Redeem a coupon code for wallet credit.
    """
    result = await redeem_coupon(
        db,
        tenant_id=current_user.tenant_id,
        coupon_code=coupon_code,
    )
    await db.commit()

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return result


# ── Wallet Balance ────────────────────────────────────────────────────────────

@router.get("/wallet")
async def get_wallet(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get current wallet balance and recent transactions.
    """
    result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Recent transactions
    tx_result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.tenant_id == current_user.tenant_id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(20)
    )
    transactions = list(tx_result.scalars().all())

    return {
        "balance": float(tenant.wallet_balance),
        "transactions": transactions,
    }


@router.get("/wallet/transactions")
async def list_transactions(
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List wallet transactions with pagination.
    """
    offset = (page - 1) * page_size

    count_result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.tenant_id == current_user.tenant_id)
    )
    total = len(list(count_result.scalars().all()))

    tx_result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.tenant_id == current_user.tenant_id)
        .order_by(WalletTransaction.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    transactions = list(tx_result.scalars().all())

    return {
        "transactions": transactions,
        "total": total,
        "page": page,
        "page_size": page_size,
    }