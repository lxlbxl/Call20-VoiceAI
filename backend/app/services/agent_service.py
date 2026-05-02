"""
Call20 — Agent Config Service (Phase 1)
CRUD operations for AI agent configurations.
"""
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.tenant import AgentConfig, Tenant
from app.services.tenant_service import check_plan_limit


async def create_agent_config(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    name: str,
    persona_prompt: str,
    greeting_message: Optional[str] = None,
    language: str = "en-NG",
    voice_engine: str = "cartesia",
    voice_id: Optional[str] = None,
    tools_enabled: list[str] = [],
    knowledge_base_ids: list[uuid.UUID] = [],
    business_hours: Optional[dict] = None,
    after_hours_behavior: str = "voicemail",
    max_call_duration_seconds: int = 600,
    sentiment_handoff_threshold: float = 0.3,
    fallback_phone: Optional[str] = None,
    recording_enabled: bool = True,
    pii_redaction_enabled: bool = True,
) -> AgentConfig:
    """Create a new agent configuration."""
    # Check plan limits
    if not await check_plan_limit(db, tenant_id, "agents"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent limit reached for your plan. Upgrade to create more agents.",
        )

    agent = AgentConfig(
        tenant_id=tenant_id,
        name=name,
        persona_prompt=persona_prompt,
        greeting_message=greeting_message,
        language=language,
        voice_engine=voice_engine,
        voice_id=voice_id,
        tools_enabled=tools_enabled,
        knowledge_base_ids=knowledge_base_ids,
        business_hours=business_hours,
        after_hours_behavior=after_hours_behavior,
        max_call_duration_seconds=max_call_duration_seconds,
        sentiment_handoff_threshold=sentiment_handoff_threshold,
        fallback_phone=fallback_phone,
        recording_enabled=recording_enabled,
        pii_redaction_enabled=pii_redaction_enabled,
    )
    db.add(agent)
    await db.flush()
    return agent


async def list_agent_configs(db: AsyncSession, tenant_id: uuid.UUID) -> list[AgentConfig]:
    """List all agent configs for a tenant."""
    result = await db.execute(
        select(AgentConfig)
        .where(AgentConfig.tenant_id == tenant_id)
        .order_by(AgentConfig.created_at.desc())
    )
    return list(result.scalars().all())


async def get_agent_config(
    db: AsyncSession, agent_id: uuid.UUID, tenant_id: uuid.UUID
) -> Optional[AgentConfig]:
    """Get a specific agent config."""
    result = await db.execute(
        select(AgentConfig).where(
            AgentConfig.id == agent_id, AgentConfig.tenant_id == tenant_id
        )
    )
    return result.scalar_one_or_none()


async def update_agent_config(
    db: AsyncSession,
    agent_id: uuid.UUID,
    tenant_id: uuid.UUID,
    **kwargs,
) -> AgentConfig:
    """Update an agent configuration."""
    agent = await get_agent_config(db, agent_id, tenant_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent config not found")

    for key, value in kwargs.items():
        if value is not None and hasattr(agent, key):
            setattr(agent, key, value)

    await db.flush()
    return agent


async def delete_agent_config(
    db: AsyncSession, agent_id: uuid.UUID, tenant_id: uuid.UUID
) -> bool:
    """Delete an agent configuration."""
    agent = await get_agent_config(db, agent_id, tenant_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent config not found")

    await db.delete(agent)
    await db.flush()
    return True


async def get_active_agent_config(
    db: AsyncSession, tenant_id: uuid.UUID
) -> Optional[AgentConfig]:
    """Get the active agent config for a tenant (for call routing)."""
    result = await db.execute(
        select(AgentConfig)
        .where(AgentConfig.tenant_id == tenant_id, AgentConfig.active == True)
        .limit(1)
    )
    return result.scalar_one_or_none()