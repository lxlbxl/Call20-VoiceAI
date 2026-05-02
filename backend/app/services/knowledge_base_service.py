"""
Call20 — Knowledge Base Service (Phase 1)
Handles KB creation, ingestion via Firecrawl, and vector search.
"""
import uuid
import httpx
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.tenant import KnowledgeBase, KBChunk, Tenant
from app.core.config import settings


async def create_knowledge_base(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    name: str,
    source_type: str,
    source_url: Optional[str] = None,
    content: Optional[str] = None,
) -> KnowledgeBase:
    """Create a new knowledge base and trigger ingestion."""
    # Check plan limits
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    # Check KB page limits
    if tenant.plan.value == "starter":
        total_pages = await get_total_kb_pages(db, tenant_id)
        if total_pages >= 50:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Starter plan limit: 50 pages. Upgrade for more.",
            )
    elif tenant.plan.value == "growth":
        total_pages = await get_total_kb_pages(db, tenant_id)
        if total_pages >= 200:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Growth plan limit: 200 pages per KB. Upgrade for more.",
            )

    kb = KnowledgeBase(
        tenant_id=tenant_id,
        name=name,
        source_type=source_type,
        source_url=source_url,
        status="pending",
        page_count=0,
    )
    db.add(kb)
    await db.flush()

    # Trigger ingestion based on source type
    if source_type == "website" and source_url:
        await trigger_firecrawl_ingestion(db, kb.id, source_url)
    elif source_type in ("pdf", "docx") and source_url:
        await trigger_document_ingestion(db, kb.id, source_url)
    elif source_type == "text" and content:
        await ingest_text_content(db, kb.id, content)
    elif source_type == "faq" and content:
        await ingest_faq_content(db, kb.id, content)

    return kb


async def trigger_firecrawl_ingestion(
    db: AsyncSession, kb_id: uuid.UUID, url: str
) -> None:
    """
    Trigger Firecrawl to scrape a website and index pages.
    In production, this calls the Firecrawl API.
    """
    kb_result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = kb_result.scalar_one_or_none()
    if not kb:
        return

    kb.status = "processing"
    await db.flush()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.FIRECRAWL_API_URL}/crawl",
                headers={"Authorization": f"Bearer {settings.FIRECRAWL_API_KEY}"},
                json={
                    "url": url,
                    "max_pages": 100,
                    "depth": 3,
                    "webhook_url": f"{settings.API_BASE_URL}/api/v1/kb/webhook/firecrawl",
                },
                timeout=30.0,
            )
            response.raise_for_status()
            job_id = response.json().get("job_id")

            # Store job_id for webhook correlation
            kb.error_message = f"Firecrawl job: {job_id}"
            await db.flush()

    except Exception as e:
        kb.status = "failed"
        kb.error_message = str(e)[:500]
        await db.flush()


async def trigger_document_ingestion(
    db: AsyncSession, kb_id: uuid.UUID, url: str
) -> None:
    """Ingest a PDF or DOCX document."""
    kb_result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = kb_result.scalar_one_or_none()
    if not kb:
        return

    kb.status = "processing"
    await db.flush()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()

            # In production, use appropriate parser (PyPDF2, python-docx)
            # For now, create a placeholder chunk
            content = f"Document content from {url}"
            chunk = KBChunk(
                kb_id=kb_id,
                tenant_id=kb.tenant_id,
                content=content[:2000],
                source_url=url,
                page_number=1,
            )
            db.add(chunk)
            kb.page_count = 1
            kb.status = "ready"
            await db.flush()

    except Exception as e:
        kb.status = "failed"
        kb.error_message = str(e)[:500]
        await db.flush()


async def ingest_text_content(
    db: AsyncSession, kb_id: uuid.UUID, content: str
) -> None:
    """Ingest raw text content, splitting into chunks."""
    kb_result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    kb = kb_result.scalar_one_or_none()
    if not kb:
        return

    # Split into ~500 char chunks
    chunk_size = 500
    chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]

    for idx, chunk_text in enumerate(chunks):
        kb_chunk = KBChunk(
            kb_id=kb_id,
            tenant_id=kb.tenant_id,
            content=chunk_text[:2000],
            page_number=idx + 1,
        )
        db.add(kb_chunk)

    kb.page_count = len(chunks)
    kb.status = "ready"
    await db.flush()


async def ingest_faq_content(
    db: AsyncSession, kb_id: uuid.UUID, content: str
) -> None:
    """Ingest FAQ content as structured chunks."""
    await ingest_text_content(db, kb_id, content)


async def search_knowledge_base(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    query: str,
    kb_ids: Optional[list[uuid.UUID]] = None,
    limit: int = 5,
) -> list[KBChunk]:
    """
    Search knowledge base chunks using vector similarity.
    In production, this uses pgvector for embedding-based search.
    """
    # In production: generate embedding for query, then use pgvector cosine similarity
    # For now, do a simple text match
    query_filter = KBChunk.tenant_id == tenant_id
    if kb_ids:
        query_filter = query_filter & KBChunk.kb_id.in_(kb_ids)

    # Simple text search (production would use vector similarity)
    result = await db.execute(
        select(KBChunk)
        .where(query_filter & KBChunk.content.ilike(f"%{query}%"))
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_knowledge_bases(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[KnowledgeBase]:
    """List all knowledge bases for a tenant."""
    result = await db.execute(
        select(KnowledgeBase)
        .where(KnowledgeBase.tenant_id == tenant_id)
        .order_by(KnowledgeBase.created_at.desc())
    )
    return list(result.scalars().all())


async def get_knowledge_base(
    db: AsyncSession, kb_id: uuid.UUID, tenant_id: uuid.UUID
) -> Optional[KnowledgeBase]:
    """Get a specific knowledge base."""
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id, KnowledgeBase.tenant_id == tenant_id
        )
    )
    return result.scalar_one_or_none()


async def delete_knowledge_base(
    db: AsyncSession, kb_id: uuid.UUID, tenant_id: uuid.UUID
) -> bool:
    """Delete a knowledge base and all its chunks."""
    kb = await get_knowledge_base(db, kb_id, tenant_id)
    if not kb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base not found")

    await db.delete(kb)
    await db.flush()
    return True


async def get_total_kb_pages(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    """Get total pages across all KBs for a tenant."""
    result = await db.execute(
        select(func.coalesce(func.sum(KnowledgeBase.page_count), 0))
        .where(KnowledgeBase.tenant_id == tenant_id)
    )
    return result.scalar() or 0