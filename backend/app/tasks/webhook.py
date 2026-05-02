"""
Call20 — Webhook Tasks
Background tasks for webhook delivery and monitoring.
"""
from app.core.celery import celery_app


@celery_app.task(bind=True, max_retries=5)
def deliver_webhook_event(
    self,
    tenant_id: str,
    event_name: str,
    payload: dict,
):
    """Deliver a webhook event asynchronously."""
    import asyncio
    from app.core.database import AsyncSession
    from app.services.webhook_service import deliver_webhook_event as _deliver

    async def _do_deliver():
        async with AsyncSession() as session:
            await _deliver(session, tenant_id, event_name, payload)
            await session.commit()

    asyncio.run(_do_deliver())


@celery_app.task
def check_failed_webhooks():
    """Celery beat task: Disable webhooks that have been failing."""
    import asyncio
    from app.core.database import AsyncSession
    from app.services.webhook_service import check_failed_webhooks as _check

    async def _do_check():
        async with AsyncSession() as session:
            disabled = await _check(session)
            await session.commit()
            if disabled:
                print(f"Disabled {len(disabled)} failing webhooks")

    asyncio.run(_do_check())