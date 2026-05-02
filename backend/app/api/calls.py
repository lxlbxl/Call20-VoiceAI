"""
Call20 — Call API (Phase 1 & 2)
Call logging, listing, analytics, transcripts.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.services.call_service import (
    create_call,
    end_call,
    get_call,
    list_calls,
    get_transcript,
    get_call_analytics,
    get_realtime_dashboard,
)
from app.schemas.auth import CallResponse, TranscriptResponse
from app.models.tenant import User

router = APIRouter(prefix="/api/v1/calls", tags=["Calls"])


@router.get("/", response_model=dict)
async def list_my_calls(
    direction: str = Query(None),
    resolution: str = Query(None),
    status_filter: str = Query(None),
    date_from: datetime = Query(None),
    date_to: datetime = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List calls with filtering and pagination."""
    calls, total = await list_calls(
        db=db,
        tenant_id=current_user.tenant_id,
        direction=direction,
        resolution=resolution,
        status_filter=status_filter,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )
    return {
        "calls": calls,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{call_id}", response_model=CallResponse)
async def get_call_by_id(
    call_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific call."""
    call = await get_call(db, call_id, current_user.tenant_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.get("/{call_id}/transcript", response_model=TranscriptResponse)
async def get_call_transcript(
    call_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a call transcript."""
    transcript = await get_transcript(db, call_id, current_user.tenant_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return transcript


@router.get("/analytics")
async def get_analytics(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get call analytics for the dashboard."""
    return await get_call_analytics(db, current_user.tenant_id, days=days)


@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get real-time dashboard metrics."""
    return await get_realtime_dashboard(db, current_user.tenant_id)


# ── Webhook endpoints for Pipecat (no auth required, uses SIP headers) ───────

@router.post("/webhook/call-started")
async def call_started_webhook(
    call_id: str,
    from_number: str,
    to_number: str,
    agent_config_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Webhook called by Pipecat when a call starts."""
    # In production, verify the request comes from the Pipecat service
    call = await create_call(
        db=db,
        tenant_id=uuid.UUID(agent_config_id.split(":")[0]) if agent_config_id else None,
        direction="inbound",
        from_number=from_number,
        to_number=to_number,
        agent_config_id=uuid.UUID(agent_config_id) if agent_config_id else None,
    )
    await db.commit()
    return {"call_id": str(call.id)}


@router.post("/webhook/call-ended")
async def call_ended_webhook(
    call_id: str,
    duration_seconds: int,
    sentiment_score: float = None,
    resolution: str = None,
    handoff_reason: str = None,
    recording_url: str = None,
    transcript_url: str = None,
    summary: str = None,
    tools_triggered: list = None,
    status: str = "completed",
    db: AsyncSession = Depends(get_db),
):
    """Webhook called by Pipecat when a call ends."""
    ended_call = await end_call(
        db=db,
        call_id=uuid.UUID(call_id),
        tenant_id=None,  # In production, extract from call record
        duration_seconds=duration_seconds,
        sentiment_score=sentiment_score,
        resolution=resolution,
        handoff_reason=handoff_reason,
        recording_url=recording_url,
        transcript_url=transcript_url,
        summary=summary,
        tools_triggered=tools_triggered,
        status=status,
    )
    await db.commit()
    return {"status": "ok"}