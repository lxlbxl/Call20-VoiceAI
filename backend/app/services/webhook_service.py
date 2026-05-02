"""
Call20 — Webhook & Event Service (Phase 1)
Webhook endpoint management, event delivery with HMAC signatures, retry logic.
"""
import uuid
import secrets
import hmac
import hashlib
import json
from datetime import datetime
from typing import Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.tenant import Webhook, Tenant, WebhookDelivery
from app.core.config import settings


# ── Webhook CRUD ──────────────────────────────────────────────────────────────

async def create_webhook(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    url: str,
    events_subscribed: list[str],
    secret: Optional[str] = None,
) -> Webhook:
    """Create a new webhook endpoint."""
    # Check plan limits
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    # Starter plan: no webhooks
    if tenant.plan.value == "starter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Webhooks require Growth plan or higher.",
        )

    # Check webhook count limit
    result = await db.execute(
        select(Webhook).where(Webhook.tenant_id == tenant_id)
    )
    existing = list(result.scalars().all())
    max_webhooks = 5  # All plans support up to 5

    if len(existing) >= max_webhooks:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Maximum {max_webhooks} webhook endpoints allowed.",
        )

    webhook_secret = secret or secrets.token_urlsafe(32)

    webhook = Webhook(
        tenant_id=tenant_id,
        url=url,
        events_subscribed=events_subscribed,
        secret=webhook_secret,
        active=True,
    )
    db.add(webhook)
    await db.flush()
    return webhook


async def list_webhooks(db: AsyncSession, tenant_id: uuid.UUID) -> list[Webhook]:
    """List all webhook endpoints for a tenant."""
    result = await db.execute(
        select(Webhook)
        .where(Webhook.tenant_id == tenant_id)
        .order_by(Webhook.created_at.desc())
    )
    return list(result.scalars().all())


async def get_webhook(
    db: AsyncSession, webhook_id: uuid.UUID, tenant_id: uuid.UUID
) -> Optional[Webhook]:
    """Get a specific webhook."""
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def update_webhook(
    db: AsyncSession,
    webhook_id: uuid.UUID,
    tenant_id: uuid.UUID,
    **kwargs,
) -> Webhook:
    """Update a webhook endpoint."""
    webhook = await get_webhook(db, webhook_id, tenant_id)
    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    for key, value in kwargs.items():
        if value is not None and hasattr(webhook, key):
            setattr(webhook, key, value)

    await db.flush()
    return webhook


async def delete_webhook(
    db: AsyncSession, webhook_id: uuid.UUID, tenant_id: uuid.UUID
) -> bool:
    """Delete a webhook endpoint."""
    webhook = await get_webhook(db, webhook_id, tenant_id)
    if not webhook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Webhook not found")

    await db.delete(webhook)
    await db.flush()
    return True


# ── Event Delivery ────────────────────────────────────────────────────────────

async def deliver_webhook_event(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    event_name: str,
    payload: dict,
) -> None:
    """
    Deliver a webhook event to all matching endpoints.
    Uses exponential backoff retry (1s, 2s, 4s, 8s, 16s).
    """
    # Find active webhooks subscribed to this event
    result = await db.execute(
        select(Webhook).where(
            Webhook.tenant_id == tenant_id,
            Webhook.active == True,
        )
    )
    webhooks = list(result.scalars().all())

    for webhook in webhooks:
        if event_name not in webhook.events_subscribed:
            continue

        await _deliver_to_endpoint(db, webhook, event_name, payload)


async def _deliver_to_endpoint(
    db: AsyncSession,
    webhook: Webhook,
    event_name: str,
    payload: dict,
) -> None:
    """Deliver event to a single webhook endpoint with retry logic."""
    max_retries = 5
    base_delay = 1.0

    payload_with_meta = {
        "event": event_name,
        "timestamp": datetime.utcnow().isoformat(),
        "data": payload,
    }

    for attempt in range(max_retries):
        status_code = None
        response_body = None
        start_time = datetime.utcnow()

        try:
            # Create HMAC signature
            body = json.dumps(payload_with_meta, separators=(",", ":"))
            signature = hmac.new(
                webhook.secret.encode("utf-8"),
                body.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook.url,
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Call20-Signature": f"sha256={signature}",
                        "X-Call20-Event": event_name,
                        "X-Call20-Attempt": str(attempt + 1),
                    },
                    timeout=10.0,
                )

                status_code = response.status_code
                response_body = response.text

                # Log delivery attempt
                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                delivery = WebhookDelivery(
                    webhook_id=webhook.id,
                    tenant_id=webhook.tenant_id,
                    event_type=event_name,
                    status_code=status_code,
                    request_payload=payload_with_meta,
                    response_body=response_body[:2000] if response_body else None,
                    duration_ms=int(duration),
                )
                db.add(delivery)

                if response.status_code < 300:
                    # Success
                    webhook.last_delivery_at = datetime.utcnow()
                    webhook.failure_count = 0
                    await db.flush()
                    return

                # Non-2xx response
                webhook.failure_count += 1

        except Exception as e:
            webhook.failure_count += 1
            duration = (datetime.utcnow() - start_time).total_seconds() * 1000
            delivery = WebhookDelivery(
                webhook_id=webhook.id,
                tenant_id=webhook.tenant_id,
                event_type=event_name,
                status_code=status_code,
                request_payload=payload_with_meta,
                response_body=str(e),
                duration_ms=int(duration),
            )
            db.add(delivery)

        # Exponential backoff
        delay = base_delay * (2 ** attempt)
        await _sleep(delay)

    # All retries failed
    if webhook.failure_count >= 10:
        # Auto-disable after sustained failures
        webhook.active = False

    await db.flush()


async def _sleep(seconds: float) -> None:
    """Async sleep (in production, use Celery beat for retries)."""
    import asyncio
    await asyncio.sleep(seconds)


# ── Celery Job: Check Failed Webhooks ────────────────────────────────────────

async def check_failed_webhooks(db: AsyncSession) -> list[str]:
    """
    Celery job: Disable webhooks that have been failing for > 24 hours.
    Returns list of disabled webhook URLs.
    """
    from datetime import timedelta

    disabled = []
    cutoff = datetime.utcnow() - timedelta(hours=24)

    result = await db.execute(
        select(Webhook).where(
            Webhook.active == True,
            Webhook.failure_count >= 5,
            Webhook.last_delivery_at <= cutoff,
        )
    )
    failing_webhooks = list(result.scalars().all())

    for webhook in failing_webhooks:
        webhook.active = False
        disabled.append(webhook.url)

    await db.flush()
    return disabled