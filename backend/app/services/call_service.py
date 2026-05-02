"""
Call20 — Call Service (Phase 1 & 2)
Call logging, transcript management, call analytics, and cost calculation.
"""
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status

from app.models.tenant import Call, Transcript, DID, AgentConfig, Tenant
from app.models.wallet_transaction import WalletTransaction, TransactionType, TransactionSource
from app.core.config import settings


# ── Cost Calculation ──────────────────────────────────────────────────────────

def calculate_call_cost(
    duration_seconds: int,
    tenant_plan: str,
    did_country: str = "NG",
    voice_engine: str = "cartesia",
    tts_chars: int = 0,
) -> float:
    """
    Calculate call cost based on the PRD formula:
    Cost = DIDWW_Inbound + STT_Cost + LLM_Cost + [TTS_Cost] + Call20_Margin
    """
    duration_min = Decimal(max(duration_seconds / 60.0, 0.1))  # Minimum 6 seconds

    # DIDWW inbound cost (~$0.012/min for NG)
    didww_cost = Decimal("0.012") * duration_min

    # Deepgram STT cost (~$0.0059/min)
    stt_cost = Decimal("0.0059") * duration_min

    # LLM cost (Gemini Flash ~$0.075/1M tokens, estimate ~500 tokens/min)
    llm_cost = (Decimal("0.075") / Decimal("1000000")) * Decimal("500") * duration_min

    # TTS cost
    tts_cost = Decimal("0.0")
    if voice_engine == "cartesia":
        tts_cost = Decimal("0.015") * duration_min  # Cartesia ~$0.015/min equiv.
    elif voice_engine == "elevenlabs":
        tts_cost = Decimal("0.02") * duration_min  # ElevenLabs ~$0.02/min equiv.

    # Call20 margin (varies by plan)
    margins = {
        "starter": Decimal("0.10"),
        "growth": Decimal("0.08"),
        "scale": Decimal("0.06"),
        "enterprise": Decimal("0.04"),
    }
    margin = margins.get(tenant_plan, Decimal("0.10"))
    base_cost = didww_cost + stt_cost + llm_cost + tts_cost
    total_cost = base_cost * (Decimal("1") + margin)

    return float(round(total_cost, 4))


# ── Call Logging ──────────────────────────────────────────────────────────────

async def create_call(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    direction: str = "inbound",
    from_number: Optional[str] = None,
    to_number: Optional[str] = None,
    agent_config_id: Optional[uuid.UUID] = None,
    did_id: Optional[uuid.UUID] = None,
) -> Call:
    """Create a new call record."""
    call = Call(
        tenant_id=tenant_id,
        direction=direction,
        from_number=from_number,
        to_number=to_number,
        agent_config_id=agent_config_id,
        did_id=did_id,
        status="active",
    )
    db.add(call)
    await db.flush()
    return call


async def end_call(
    db: AsyncSession,
    call_id: uuid.UUID,
    tenant_id: uuid.UUID,
    duration_seconds: int,
    sentiment_score: Optional[float] = None,
    resolution: Optional[str] = None,
    handoff_reason: Optional[str] = None,
    recording_url: Optional[str] = None,
    transcript_url: Optional[str] = None,
    summary: Optional[str] = None,
    tools_triggered: Optional[list] = None,
    status: str = "completed",
) -> Call:
    """End a call and calculate cost."""
    call_result = await db.execute(
        select(Call).where(Call.id == call_id)
    )
    call = call_result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")

    # Ensure tenant_id is available
    if tenant_id is None:
        tenant_id = call.tenant_id

    # Get tenant plan for cost calculation
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    plan = tenant.plan.value if tenant else "starter"

    # Get voice engine from agent config
    voice_engine = "cartesia"
    if agent_config_id:
        agent_result = await db.execute(
            select(AgentConfig).where(AgentConfig.id == agent_config_id)
        )
        agent = agent_result.scalar_one_or_none()
        if agent:
            voice_engine = agent.voice_engine

    # Calculate cost
    cost = calculate_call_cost(duration_seconds, plan, voice_engine=voice_engine)

    # Update call
    call.duration_seconds = duration_seconds
    call.cost_usd = cost
    call.sentiment_score = sentiment_score
    call.resolution = resolution
    call.handoff_reason = handoff_reason
    call.recording_url = recording_url
    call.transcript_url = transcript_url
    call.summary = summary
    call.tools_triggered = tools_triggered or []
    call.status = status

    # Deduct from wallet
    if tenant:
        tenant.wallet_balance -= cost
        if tenant.wallet_balance < 0:
            tenant.wallet_balance = 0.0

        # Create wallet transaction
        transaction = WalletTransaction(
            tenant_id=tenant_id,
            call_id=call_id,
            amount=-cost,
            type=TransactionType.DEBIT,
            source=TransactionSource.CALL_USAGE,
            balance_after=tenant.wallet_balance,
        )
        db.add(transaction)

    await db.flush()
    return call


async def get_call(
    db: AsyncSession, call_id: uuid.UUID, tenant_id: uuid.UUID
) -> Optional[Call]:
    """Get a specific call."""
    result = await db.execute(
        select(Call).where(Call.id == call_id, Call.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def list_calls(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    direction: Optional[str] = None,
    resolution: Optional[str] = None,
    status_filter: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Call], int]:
    """List calls with filtering and pagination."""
    filters = [Call.tenant_id == tenant_id]

    if direction:
        filters.append(Call.direction == direction)
    if resolution:
        filters.append(Call.resolution == resolution)
    if status_filter:
        filters.append(Call.status == status_filter)
    if date_from:
        filters.append(Call.created_at >= date_from)
    if date_to:
        filters.append(Call.created_at <= date_to)

    # Count total
    count_result = await db.execute(
        select(func.count(Call.id)).where(and_(*filters))
    )
    total = count_result.scalar() or 0

    # Get page
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Call)
        .where(and_(*filters))
        .order_by(Call.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    calls = list(result.scalars().all())

    return calls, total


# ── Transcript Management ────────────────────────────────────────────────────

async def save_transcript(
    db: AsyncSession,
    call_id: uuid.UUID,
    tenant_id: uuid.UUID,
    content_json: dict,
) -> Transcript:
    """Save a call transcript."""
    transcript = Transcript(
        call_id=call_id,
        tenant_id=tenant_id,
        content_json=content_json,
    )
    db.add(transcript)
    await db.flush()
    return transcript


async def get_transcript(
    db: AsyncSession, call_id: uuid.UUID, tenant_id: uuid.UUID
) -> Optional[Transcript]:
    """Get a call transcript."""
    result = await db.execute(
        select(Transcript)
        .join(Call, Transcript.call_id == Call.id)
        .where(Call.id == call_id, Call.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


# ── Analytics ─────────────────────────────────────────────────────────────────

async def get_call_analytics(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    days: int = 30,
) -> dict:
    """Get call analytics for the dashboard."""
    date_from = datetime.utcnow() - timedelta(days=days)

    # Total calls
    total_result = await db.execute(
        select(func.count(Call.id))
        .where(Call.tenant_id == tenant_id, Call.created_at >= date_from)
    )
    total_calls = total_result.scalar() or 0

    # Total duration
    duration_result = await db.execute(
        select(func.coalesce(func.sum(Call.duration_seconds), 0))
        .where(Call.tenant_id == tenant_id, Call.created_at >= date_from)
    )
    total_duration = duration_result.scalar() or 0

    # Total cost
    cost_result = await db.execute(
        select(func.coalesce(func.sum(Call.cost_usd), 0))
        .where(Call.tenant_id == tenant_id, Call.created_at >= date_from)
    )
    total_cost = cost_result.scalar() or 0.0

    # Average duration
    avg_duration = total_duration / total_calls if total_calls > 0 else 0

    # Calls by resolution
    resolution_result = await db.execute(
        select(Call.resolution, func.count(Call.id))
        .where(Call.tenant_id == tenant_id, Call.created_at >= date_from)
        .group_by(Call.resolution)
    )
    by_resolution = {row[0]: row[1] for row in resolution_result.all() if row[0]}

    # Calls by day (last 7 days)
    daily_result = await db.execute(
        select(
            func.date(Call.created_at).label("date"),
            func.count(Call.id).label("count"),
            func.coalesce(func.sum(Call.cost_usd), 0).label("cost"),
        )
        .where(Call.tenant_id == tenant_id, Call.created_at >= date_from)
        .group_by(func.date(Call.created_at))
        .order_by(func.date(Call.created_at))
    )
    daily_calls = [
        {"date": str(row.date), "count": row.count, "cost": float(row.cost)}
        for row in daily_result.all()
    ]

    # Average sentiment
    sentiment_result = await db.execute(
        select(func.avg(Call.sentiment_score))
        .where(
            Call.tenant_id == tenant_id,
            Call.created_at >= date_from,
            Call.sentiment_score.isnot(None),
        )
    )
    avg_sentiment = sentiment_result.scalar()

    # Handoff count
    handoff_result = await db.execute(
        select(func.count(Call.id))
        .where(
            Call.tenant_id == tenant_id,
            Call.created_at >= date_from,
            Call.handoff_reason.isnot(None),
        )
    )
    handoff_count = handoff_result.scalar() or 0

    return {
        "total_calls": total_calls,
        "total_duration_seconds": total_duration,
        "total_cost_usd": round(total_cost, 2),
        "avg_duration_seconds": round(avg_duration, 1),
        "by_resolution": by_resolution,
        "daily_calls": daily_calls,
        "avg_sentiment": round(avg_sentiment, 2) if avg_sentiment else None,
        "handoff_count": handoff_count,
    }


async def get_realtime_dashboard(
    db: AsyncSession,
    tenant_id: uuid.UUID,
) -> dict:
    """Get real-time dashboard metrics."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Today's calls
    today_result = await db.execute(
        select(func.count(Call.id))
        .where(Call.tenant_id == tenant_id, Call.created_at >= today_start)
    )
    today_calls = today_result.scalar() or 0

    # Active calls (status = active)
    active_result = await db.execute(
        select(func.count(Call.id))
        .where(Call.tenant_id == tenant_id, Call.status == "active")
    )
    active_calls = active_result.scalar() or 0

    # Wallet balance
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    wallet_balance = tenant.wallet_balance if tenant else 0.0

    # DIDs
    did_result = await db.execute(
        select(func.count(DID.id))
        .where(DID.tenant_id == tenant_id, DID.status == "active")
    )
    active_dids = did_result.scalar() or 0

    return {
        "today_calls": today_calls,
        "active_calls": active_calls,
        "wallet_balance": round(wallet_balance, 2),
        "active_dids": active_dids,
    }