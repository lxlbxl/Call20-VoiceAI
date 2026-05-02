"""
Call20 — Knowledge Base Tasks
Background tasks for KB ingestion via Firecrawl.
"""
from app.core.celery import celery_app


@celery_app.task(bind=True, max_retries=3)
def trigger_firecrawl_ingestion(
    self,
    kb_id: str,
    url: str,
    max_pages: int = 100,
    depth: int = 3,
):
    """Trigger Firecrawl to scrape a website and index pages."""
    import asyncio
    import httpx
    from app.core.database import AsyncSession
    from app.core.config import settings

    async def _do_ingest():
        async with AsyncSession() as session:
            from app.models.tenant import KnowledgeBase
            from sqlalchemy import select

            result = await session.execute(
                select(KnowledgeBase).where(KnowledgeBase.id == kb_id)
            )
            kb = result.scalar_one_or_none()
            if not kb:
                return

            kb.status = "processing"
            await session.flush()

            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{settings.FIRECRAWL_API_URL}/crawl",
                        headers={"Authorization": f"Bearer {settings.FIRECRAWL_API_KEY}"},
                        json={
                            "url": url,
                            "max_pages": max_pages,
                            "depth": depth,
                            "webhook_url": f"{settings.API_BASE_URL}/api/v1/kb/webhook/firecrawl",
                        },
                        timeout=30.0,
                    )
                    response.raise_for_status()
                    job_id = response.json().get("job_id")
                    kb.error_message = f"Firecrawl job: {job_id}"
                    await session.flush()

            except Exception as e:
                kb.status = "failed"
                kb.error_message = str(e)[:500]
                await session.flush()
                raise

    asyncio.run(_do_ingest())


@celery_app.task(bind=True, max_retries=3)
def process_firecrawl_webhook(
    self,
    job_id: str,
    status: str,
    pages_data: list,
):
    """Process Firecrawl webhook data and create KB chunks."""
    import asyncio
    from app.core.database import AsyncSession
    from app.models.tenant import KnowledgeBase, KBChunk

    async def _process():
        async with AsyncSession() as session:
            # Find KB by job_id
            from sqlalchemy import select
            result = await session.execute(
                select(KnowledgeBase).where(
                    KnowledgeBase.error_message.ilike(f"%{job_id}%")
                )
            )
            kb = result.scalar_one_or_none()
            if not kb:
                return

            if status == "completed":
                for page in pages_data:
                    chunk = KBChunk(
                        kb_id=kb.id,
                        tenant_id=kb.tenant_id,
                        content=page.get("content", "")[:2000],
                        source_url=page.get("url", ""),
                        page_number=page.get("page_number", 0),
                    )
                    session.add(chunk)

                kb.page_count = len(pages_data)
                kb.status = "ready"
                kb.error_message = None
                await session.flush()

    asyncio.run(_process())