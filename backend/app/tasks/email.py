"""
Call20 — Email Tasks
Background tasks for sending verification emails, invitations, notifications.
"""
from app.core.celery import celery_app


@celery_app.task(bind=True, max_retries=3)
def send_verification_email(self, to_email: str, token: str):
    """Send email verification link."""
    # In production, use SendGrid, SES, or similar
    verification_url = f"https://app.call20.ai/verify?token={token}"
    subject = "Verify your Call20 account"
    body = f"""
    Welcome to Call20!
    
    Please verify your email by clicking this link:
    {verification_url}
    
    This link expires in 24 hours.
    """
    # await send_email(to_email, subject, body)
    print(f"[EMAIL] To: {to_email}, Subject: {subject}")


@celery_app.task(bind=True, max_retries=3)
def send_invitation_email(self, to_email: str, temp_password: str):
    """Send team invitation email."""
    login_url = "https://app.call20.ai/login"
    subject = "You've been invited to Call20"
    body = f"""
    You've been invited to join a workspace on Call20.
    
    Login URL: {login_url}
    Temporary password: {temp_password}
    
    Please change your password after logging in.
    """
    print(f"[EMAIL] To: {to_email}, Subject: {subject}")


@celery_app.task(bind=True, max_retries=3)
def send_low_balance_alert(self, tenant_id: str, balance: float):
    """Send low wallet balance alert."""
    # Fetch tenant email
    subject = "Call20: Low Wallet Balance"
    body = f"""
    Your Call20 wallet balance is ${balance:.2f}.
    
    Please top up to avoid service interruption.
    """
    print(f"[EMAIL] Tenant: {tenant_id}, Subject: {subject}")


@celery_app.task(bind=True, max_retries=3)
def send_daily_usage_report(self, tenant_id: str):
    """Send daily usage report email."""
    subject = "Call20 Daily Usage Report"
    body = f"""
    Your Call20 usage for today:
    - Calls: X
    - Duration: X minutes
    - Cost: $X.XX
    - Remaining balance: $X.XX
    """
    print(f"[EMAIL] Tenant: {tenant_id}, Subject: {subject}")


@celery_app.task
def check_low_wallet_balance():
    """Celery beat task: Check all tenants for low balance."""
    from sqlalchemy import select
    from app.core.database import AsyncSession
    from app.models.tenant import Tenant

    async def _check():
        async with AsyncSession() as session:
            result = await session.execute(
                select(Tenant).where(Tenant.status.value == "active")
            )
            tenants = list(result.scalars().all())

            for tenant in tenants:
                threshold = 5.0  # $5 threshold
                if tenant.wallet_balance <= threshold:
                    send_low_balance_alert.delay(str(tenant.id), float(tenant.wallet_balance))

    import asyncio
    asyncio.run(_check())