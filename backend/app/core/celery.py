"""
Call20 — Celery Configuration
Background task processing for email, webhooks, KB ingestion, etc.
"""
import os

from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

celery_app = Celery(
    "call20",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "app.tasks.email",
        "app.tasks.webhook",
        "app.tasks.knowledge_base",
        "app.tasks.credit_expiry",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    task_soft_time_limit=240,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# ── Scheduled Tasks ───────────────────────────────────────────────────────────

celery_app.conf.beat_schedule = {
    "check-failed-webhooks": {
        "task": "app.tasks.webhook.check_failed_webhooks",
        "schedule": crontab(minute="*/15"),  # Every 15 minutes
    },
    "check-low-wallet-balance": {
        "task": "app.tasks.email.check_low_wallet_balance",
        "schedule": crontab(minute="0", hour="*/6"),  # Every 6 hours
    },
    "expire-credits": {
        "task": "app.tasks.credit_expiry.expire_old_credits",
        "schedule": crontab(minute="0", hour="0"),  # Daily at midnight
    },
    "send-daily-usage-report": {
        "task": "app.tasks.email.send_daily_usage_report",
        "schedule": crontab(minute="0", hour="8"),  # Daily at 8 AM
    },
}

if __name__ == "__main__":
    celery_app.start()