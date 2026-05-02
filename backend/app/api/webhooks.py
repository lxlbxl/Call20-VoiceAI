"""
Call20 — Webhook API (Phase 1)
Webhook endpoint management.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.services.webhook_service import (
    create_webhook,
    list_webhooks,
    get_webhook,
    update_webhook,
    delete_webhook,
)
from app.schemas.auth import WebhookCreateRequest, WebhookResponse, WebhookUpdateRequest
from app.models.tenant import User

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])


@router.post("/", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook_endpoint(
    request: WebhookCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new webhook endpoint."""
    webhook = await create_webhook(
        db=db,
        tenant_id=current_user.tenant_id,
        url=request.url,
        events_subscribed=request.events_subscribed,
        secret=request.secret,
    )
    await db.commit()
    return webhook


@router.get("/", response_model=list[WebhookResponse])
async def list_webhook_endpoints(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all webhook endpoints."""
    return await list_webhooks(db, current_user.tenant_id)


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook_endpoint(
    webhook_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific webhook endpoint."""
    webhook = await get_webhook(db, webhook_id, current_user.tenant_id)
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return webhook


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook_endpoint(
    webhook_id: uuid.UUID,
    request: WebhookUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a webhook endpoint."""
    webhook = await update_webhook(
        db=db,
        webhook_id=webhook_id,
        tenant_id=current_user.tenant_id,
        **request.model_dump(exclude_unset=True),
    )
    await db.commit()
    return webhook


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook_endpoint(
    webhook_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a webhook endpoint."""
    await delete_webhook(db, webhook_id, current_user.tenant_id)
    await db.commit()