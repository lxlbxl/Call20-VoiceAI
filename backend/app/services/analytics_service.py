"""
Call20 — Analytics Service
Business logic for aggregating and retrieving metrics.
"""
from datetime import date, datetime
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.tenant import Tenant, Call, DailyTenantMetric


async def aggregate_metrics_for_date(db: AsyncSession, target_date: date) -> None:
    """Aggregate call metrics for all tenants for a specific date."""
    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date, datetime.max.time())

    # Get all tenants
    tenant_result = await db.execute(select(Tenant.id))
    tenant_ids = tenant_result.scalars().all()

    for tenant_id in tenant_ids:
        # Calculate metrics
        stats_query = select(
            func.count(Call.id).label("total_calls"),
            func.sum(Call.duration_seconds).label("total_duration"),
            func.sum(Call.cost_usd).label("total_cost"),
            func.avg(Call.sentiment_score).label("avg_sentiment"),
            func.count(Call.id).filter(Call.resolution == "escalated").label("handoff_count")
        ).where(
            Call.tenant_id == tenant_id,
            Call.created_at >= start_dt,
            Call.created_at <= end_dt
        )

        result = await db.execute(stats_query)
        stats = result.one()

        if stats.total_calls == 0:
            continue

        # Upsert metric
        metric_query = select(DailyTenantMetric).where(
            DailyTenantMetric.tenant_id == tenant_id,
            DailyTenantMetric.date == start_dt
        )
        existing_result = await db.execute(metric_query)
        metric = existing_result.scalar_one_or_none()

        if not metric:
            metric = DailyTenantMetric(
                tenant_id=tenant_id,
                date=start_dt
            )
            db.add(metric)

        metric.total_calls = stats.total_calls
        metric.total_duration_seconds = stats.total_duration or 0
        metric.total_cost_usd = stats.total_cost or 0
        metric.avg_sentiment = stats.avg_sentiment
        metric.handoff_count = stats.handoff_count

    await db.flush()
