"""
Call20 — SMS API (Phase 1)
SMS sending, listing, and inbound webhook.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.services.sms_service import send_sms, list_sms_messages, receive_inbound_sms
from app.schemas.auth import SMSMessageResponse, SMSSendRequest
from app.models.tenant import User

router = APIRouter(prefix="/api/v1/sms", tags=["SMS"])


@router.post("/", response_model=SMSMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_sms_message(
    request: SMSSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send an outbound SMS."""
    sms = await send_sms(
        db=db,
        tenant_id=current_user.tenant_id,
        to_number=request.to_number,
        content=request.content,
    )
    await db.commit()
    return sms


@router.get("/", response_model=dict)
async def list_sms_messages_endpoint(
    direction: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List SMS messages with pagination."""
    messages, total = await list_sms_messages(
        db=db,
        tenant_id=current_user.tenant_id,
        direction=direction,
        page=page,
        page_size=page_size,
    )
    return {
        "messages": messages,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/webhook/inbound")
async def inbound_sms_webhook(
    from_number: str,
    to_number: str,
    content: str,
    db: AsyncSession = Depends(get_db),
):
    """Webhook endpoint for inbound SMS from DIDWW."""
    sms = await receive_inbound_sms(
        db=db,
        from_number=from_number,
        to_number=to_number,
        content=content,
    )
    await db.commit()
    return {"status": "received", "sms_id": str(sms.id) if sms else None}