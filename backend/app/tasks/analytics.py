"""
Call20 — Analytics Tasks
Background tasks for aggregating metrics and reporting.
"""
from datetime import datetime, timedelta
from app.core.celery import celery_app


@celery_app.task
def aggregate_daily_metrics():
    """Celery beat task: Aggregate call metrics for the previous day."""
    import asyncio
    from app.core.database import AsyncSession
    from app.services.analytics_service import aggregate_metrics_for_date

    yesterday = (datetime.utcnow() - timedelta(days=1)).date()

    async def _do_aggregate():
        async with AsyncSession() as session:
            await aggregate_metrics_for_date(session, yesterday)
            await session.commit()

    asyncio.run(_do_aggregate())
