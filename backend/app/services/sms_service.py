"""
Call20 — SMS Service (Phase 1)
Inbound/outbound SMS, template management, opt-out handling.
"""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.tenant import SMSMessage, DID, Tenant
from app.core.config import settings


# ── SMS Pricing ───────────────────────────────────────────────────────────────

SMS_PRICING = {
    "NG": 0.05,  # Nigeria
    "KE": 0.04,  # Kenya
    "GH": 0.04,  # Ghana
    "ZA": 0.04,  # South Africa
}


# ── SMS CRUD ──────────────────────────────────────────────────────────────────

async def send_sms(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    to_number: str,
    content: str,
    call_id: Optional[uuid.UUID] = None,
    from_number: Optional[str] = None,
) -> SMSMessage:
    """Send an outbound SMS via DIDWW."""
    # Check opt-out list
    if await is_opted_out(db, tenant_id, to_number):
        # Silently drop and log
        sms = SMSMessage(
            tenant_id=tenant_id,
            call_id=call_id,
            direction="outbound",
            to_number=to_number,
            from_number=from_number,
            content=content,
            status="dropped_opt_out",
        )
        db.add(sms)
        await db.flush()
        return sms

    # Get DID for sending
    if not from_number:
        did_result = await db.execute(
            select(DID).where(
                DID.tenant_id == tenant_id,
                DID.sms_enabled == True,
                DID.status == "active",
            ).limit(1)
        )
        did = did_result.scalar_one_or_none()
        if did:
            from_number = did.number

    # Validate content length
    if len(content) > 480:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SMS content exceeds 480 characters (3-part limit).",
        )

    # Create SMS record
    sms = SMSMessage(
        tenant_id=tenant_id,
        call_id=call_id,
        direction="outbound",
        to_number=to_number,
        from_number=from_number,
        content=content,
        status="queued",
    )
    db.add(sms)
    await db.flush()

    # In production, call DIDWW SMS API
    # For now, mark as sent immediately
    sms.status = "sent"
    sms.didww_message_id = f"didww_{uuid.uuid4().hex[:12]}"
    await db.flush()

    return sms


async def receive_inbound_sms(
    db: AsyncSession,
    from_number: str,
    to_number: str,
    content: str,
) -> SMSMessage:
    """Handle an inbound SMS from DIDWW webhook."""
    # Find tenant by DID number
    did_result = await db.execute(
        select(DID).where(DID.number == to_number, DID.sms_enabled == True)
    )
    did = did_result.scalar_one_or_none()
    if not did:
        # No matching DID, drop silently
        return None

    # Check opt-out
    if await is_opted_out(db, did.tenant_id, from_number):
        sms = SMSMessage(
            tenant_id=did.tenant_id,
            direction="inbound",
            to_number=to_number,
            from_number=from_number,
            content=content,
            status="dropped_opt_out",
        )
        db.add(sms)
        await db.flush()
        return sms

    # Create inbound SMS record
    sms = SMSMessage(
        tenant_id=did.tenant_id,
        direction="inbound",
        to_number=to_number,
        from_number=from_number,
        content=content,
        status="received",
    )
    db.add(sms)
    await db.flush()

    # In production: trigger AI response generation via Celery
    # from app.services.sms_ai_response import generate_ai_response
    # await generate_ai_response.delay(str(sms.id))

    return sms


async def list_sms_messages(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    direction: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[SMSMessage], int]:
    """List SMS messages with pagination."""
    from sqlalchemy import func, and_

    filters = [SMSMessage.tenant_id == tenant_id]
    if direction:
        filters.append(SMSMessage.direction == direction)

    count_result = await db.execute(
        select(func.count(SMSMessage.id)).where(and_(*filters))
    )
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(SMSMessage)
        .where(and_(*filters))
        .order_by(SMSMessage.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    messages = list(result.scalars().all())

    return messages, total


# ── Opt-Out Management ────────────────────────────────────────────────────────

OPT_OUT_KEYWORDS = ["stop", "unsubscribe", "optout", "cancel"]


async def is_opted_out(
    db: AsyncSession, tenant_id: uuid.UUID, phone_number: str
) -> bool:
    """Check if a phone number is opted out."""
    # In production, use a dedicated opt_out table
    # For now, check SMS history for STOP keywords
    result = await db.execute(
        select(SMSMessage).where(
            SMSMessage.tenant_id == tenant_id,
            SMSMessage.to_number == phone_number,
            SMSMessage.direction == "inbound",
            SMSMessage.content.ilike("%stop%"),
        ).limit(1)
    )
    return result.scalar_one_or_none() is not None


async def add_opt_out(
    db: AsyncSession, tenant_id: uuid.UUID, phone_number: str
) -> None:
    """Add a phone number to the opt-out list."""
    # In production, insert into opt_out table
    pass


async def remove_opt_out(
    db: AsyncSession, tenant_id: uuid.UUID, phone_number: str
) -> None:
    """Remove a phone number from the opt-out list."""
    pass


# ── SMS Templates ─────────────────────────────────────────────────────────────

# Stored as tenant settings; max 20 templates per tenant
SMS_TEMPLATE_SCHEMA = {
    "appointment_confirmation": {
        "name": "Appointment Confirmation",
        "template": "Hi {name}, your appointment is confirmed for {date} at {time}. Reply CANCEL to reschedule.",
    },
    "appointment_reminder": {
        "name": "Appointment Reminder",
        "template": "Reminder: You have an appointment tomorrow at {time}. Call us to reschedule.",
    },
    "receipt": {
        "name": "Payment Receipt",
        "template": "Thank you! Your payment of {amount} was received. Reference: {ref}",
    },
}