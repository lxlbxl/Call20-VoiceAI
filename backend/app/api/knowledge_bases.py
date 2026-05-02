"""
Call20 — Knowledge Base API (Phase 1)
KB creation, listing, search, and deletion.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.services.knowledge_base_service import (
    create_knowledge_base,
    list_knowledge_bases,
    get_knowledge_base,
    delete_knowledge_base,
    search_knowledge_base,
)
from app.schemas.auth import KnowledgeBaseCreateRequest, KnowledgeBaseResponse
from app.models.tenant import User

router = APIRouter(prefix="/api/v1/kb", tags=["Knowledge Bases"])


@router.post("/", response_model=KnowledgeBaseResponse, status_code=status.HTTP_201_CREATED)
async def create_kb(
    request: KnowledgeBaseCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new knowledge base and trigger ingestion."""
    kb = await create_knowledge_base(
        db=db,
        tenant_id=current_user.tenant_id,
        name=request.name,
        source_type=request.source_type,
        source_url=request.source_url,
        content=request.content,
    )
    await db.commit()
    return kb


@router.get("/", response_model=list[KnowledgeBaseResponse])
async def list_kbs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all knowledge bases."""
    return await list_knowledge_bases(db, current_user.tenant_id)


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse)
async def get_kb(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific knowledge base."""
    kb = await get_knowledge_base(db, kb_id, current_user.tenant_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    return kb


@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kb(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a knowledge base and all its chunks."""
    await delete_knowledge_base(db, kb_id, current_user.tenant_id)
    await db.commit()


@router.get("/search")
async def search_kb(
    q: str = Query(..., min_length=1, max_length=500),
    kb_ids: str = Query(None, description="Comma-separated KB IDs to search within"),
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search knowledge base chunks."""
    parsed_kb_ids = None
    if kb_ids:
        parsed_kb_ids = [uuid.UUID(kb_id.strip()) for kb_id in kb_ids.split(",")]

    results = await search_knowledge_base(
        db=db,
        tenant_id=current_user.tenant_id,
        query=q,
        kb_ids=parsed_kb_ids,
        limit=limit,
    )
    return [
        {
            "id": str(chunk.id),
            "kb_id": str(chunk.kb_id),
            "content": chunk.content,
            "source_url": chunk.source_url,
            "page_number": chunk.page_number,
        }
        for chunk in results
    ]


@router.post("/webhook/firecrawl")
async def firecrawl_webhook(
    job_id: str,
    status: str,
    pages_indexed: int,
    db: AsyncSession = Depends(get_db),
):
    """Webhook endpoint for Firecrawl ingestion completion."""
    # In production, correlate job_id with KB and update status
    # For now, just acknowledge
    return {"message": "Webhook received"}