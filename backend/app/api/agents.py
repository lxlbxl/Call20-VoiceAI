"""
Call20 — Agent Config API (Phase 1)
CRUD for AI agent configurations.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.services.agent_service import (
    create_agent_config,
    list_agent_configs,
    get_agent_config,
    update_agent_config,
    delete_agent_config,
)
from app.schemas.auth import AgentConfigCreateRequest, AgentConfigUpdateRequest, AgentConfigResponse
from app.models.tenant import User

router = APIRouter(prefix="/api/v1/agents", tags=["Agents"])


@router.post("/", response_model=AgentConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    request: AgentConfigCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new agent configuration."""
    agent = await create_agent_config(
        db=db,
        tenant_id=current_user.tenant_id,
        name=request.name,
        persona_prompt=request.persona_prompt,
        greeting_message=request.greeting_message,
        language=request.language,
        voice_engine=request.voice_engine,
        voice_id=request.voice_id,
        tools_enabled=request.tools_enabled,
        knowledge_base_ids=request.knowledge_base_ids,
        business_hours=request.business_hours,
        after_hours_behavior=request.after_hours_behavior,
        max_call_duration_seconds=request.max_call_duration_seconds,
        sentiment_handoff_threshold=request.sentiment_handoff_threshold,
        fallback_phone=request.fallback_phone,
        recording_enabled=request.recording_enabled,
        pii_redaction_enabled=request.pii_redaction_enabled,
    )
    await db.commit()
    return agent


@router.get("/", response_model=list[AgentConfigResponse])
async def list_agents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all agent configurations."""
    return await list_agent_configs(db, current_user.tenant_id)


@router.get("/{agent_id}", response_model=AgentConfigResponse)
async def get_agent(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific agent configuration."""
    agent = await get_agent_config(db, agent_id, current_user.tenant_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=AgentConfigResponse)
async def update_agent(
    agent_id: uuid.UUID,
    request: AgentConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an agent configuration."""
    agent = await update_agent_config(
        db=db,
        agent_id=agent_id,
        tenant_id=current_user.tenant_id,
        **request.model_dump(exclude_unset=True),
    )
    await db.commit()
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an agent configuration."""
    await delete_agent_config(db, agent_id, current_user.tenant_id)
    await db.commit()