"""
Call20 — Credit Expiry Tasks (Phase 4)
Background task for expiring old wallet credits.
"""
from app.core.celery import celery_app


@celery_app.task
def expire_old_credits():
    """Celery beat task: Expire credits older than 1 year."""
    import asyncio
    from app.core.database import AsyncSession
    from app.services.payment_service import expire_old_credits as _expire

    async def _do_expire():
        async with AsyncSession() as session:
            count = await _expire(session)
            await session.commit()
            if count > 0:
                print(f"Expired {count} old credits")

    asyncio.run(_do_expire())