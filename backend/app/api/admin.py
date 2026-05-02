"""
Call20 — Admin Dashboard API (Phase 3)
Platform-wide admin endpoints for monitoring, settings, and management.
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.services.auth_service import get_current_user, require_role
from app.models.tenant import Tenant, User, UserRole, DID, Call, KnowledgeBase, Webhook, SMSMessage
from app.models.audit_log import AuditLog, AuditAction
from app.models.admin_setting import AdminSetting
from app.models.coupon import Coupon, CouponType
from app.models.wallet_transaction import WalletTransaction, TransactionType

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


# ── Dashboard Overview ────────────────────────────────────────────────────────

@router.get("/dashboard")
async def admin_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Get platform-wide admin dashboard metrics."""
    # Total tenants
    tenant_count = await db.execute(select(func.count(Tenant.id)))
    total_tenants = tenant_count.scalar() or 0

    # Active tenants
    active_tenants = await db.execute(
        select(func.count(Tenant.id)).where(Tenant.status.value == "active")
    )
    active_tenant_count = active_tenants.scalar() or 0

    # Total users
    user_count = await db.execute(select(func.count(User.id)))
    total_users = user_count.scalar() or 0

    # Total calls (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    call_count = await db.execute(
        select(func.count(Call.id)).where(Call.created_at >= thirty_days_ago)
    )
    total_calls = call_count.scalar() or 0

    # Total revenue (last 30 days)
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Call.cost_usd), 0))
        .where(Call.created_at >= thirty_days_ago)
    )
    total_revenue = float(revenue_result.scalar() or 0)

    # Calls by plan
    plan_result = await db.execute(
        select(Tenant.plan, func.count(Call.id))
        .join(Call, Call.tenant_id == Tenant.id)
        .where(Call.created_at >= thirty_days_ago)
        .group_by(Tenant.plan)
    )
    calls_by_plan = {row[0].value: row[1] for row in plan_result.all()}

    # Recent signups
    recent_signups = await db.execute(
        select(Tenant)
        .order_by(Tenant.created_at.desc())
        .limit(10)
    )
    recent_tenants = list(recent_signups.scalars().all())

    # Wallet transactions summary
    wallet_result = await db.execute(
        select(
            func.coalesce(func.sum(WalletTransaction.amount), 0)
        ).where(WalletTransaction.type == TransactionType.CREDIT)
    )
    total_topups = float(wallet_result.scalar() or 0)

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenant_count,
        "total_users": total_users,
        "total_calls_30d": total_calls,
        "total_revenue_30d": round(total_revenue, 2),
        "calls_by_plan": calls_by_plan,
        "total_topups": round(total_topups, 2),
        "recent_tenants": [
            {
                "id": str(t.id),
                "business_name": t.business_name,
                "plan": t.plan.value,
                "created_at": t.created_at.isoformat(),
            }
            for t in recent_tenants
        ],
    }


# ── Tenant Management ─────────────────────────────────────────────────────────

@router.get("/tenants")
async def list_all_tenants(
    status_filter: str = Query(None),
    plan_filter: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """List all tenants (admin only)."""
    filters = []
    if status_filter:
        filters.append(Tenant.status.value == status_filter)
    if plan_filter:
        filters.append(Tenant.plan.value == plan_filter)

    from sqlalchemy import and_
    where_clause = and_(*filters) if filters else True

    count_result = await db.execute(
        select(func.count(Tenant.id)).where(where_clause)
    )
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Tenant)
        .where(where_clause)
        .order_by(Tenant.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    tenants = list(result.scalars().all())

    return {
        "tenants": tenants,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/tenants/{tenant_id}")
async def get_tenant_detail(
    tenant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Get detailed tenant information."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Get tenant stats
    call_count = await db.execute(
        select(func.count(Call.id)).where(Call.tenant_id == tenant_id)
    )
    total_calls = call_count.scalar() or 0

    did_count = await db.execute(
        select(func.count(DID.id)).where(DID.tenant_id == tenant_id, DID.status.value == "active")
    )
    active_dids = did_count.scalar() or 0

    kb_count = await db.execute(
        select(func.count(KnowledgeBase.id)).where(
            KnowledgeBase.tenant_id == tenant_id,
            KnowledgeBase.status.value == "ready",
        )
    )
    ready_kbs = kb_count.scalar() or 0

    # Total spent
    spent_result = await db.execute(
        select(func.coalesce(func.sum(Call.cost_usd), 0))
        .where(Call.tenant_id == tenant_id)
    )
    total_spent = float(spent_result.scalar() or 0)

    return {
        "tenant": tenant,
        "stats": {
            "total_calls": total_calls,
            "active_dids": active_dids,
            "ready_kbs": ready_kbs,
            "total_spent": round(total_spent, 2),
        },
    }


@router.put("/tenants/{tenant_id}/status")
async def update_tenant_status(
    tenant_id: uuid.UUID,
    new_status: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Suspend or reactivate a tenant."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    from app.models.tenant import TenantStatus
    tenant.status = TenantStatus(new_status)
    await db.commit()

    return {"message": f"Tenant status updated to {new_status}"}


# ── Audit Logs ────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def list_audit_logs(
    action: str = Query(None),
    tenant_id: uuid.UUID = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """List audit logs."""
    filters = []
    if action:
        filters.append(AuditLog.action == action)
    if tenant_id:
        filters.append(AuditLog.tenant_id == tenant_id)

    from sqlalchemy import and_
    where_clause = and_(*filters) if filters else True

    count_result = await db.execute(
        select(func.count(AuditLog.id)).where(where_clause)
    )
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(AuditLog)
        .where(where_clause)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    logs = list(result.scalars().all())

    return {
        "logs": logs,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ── Admin Settings ────────────────────────────────────────────────────────────

@router.get("/settings")
async def list_admin_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """List all admin settings."""
    result = await db.execute(select(AdminSetting))
    settings = list(result.scalars().all())
    return {s.key: s.value for s in settings}


@router.put("/settings/{key}")
async def update_admin_setting(
    key: str,
    value: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Update an admin setting."""
    result = await db.execute(select(AdminSetting).where(AdminSetting.key == key))
    setting = result.scalar_one_or_none()

    if setting:
        setting.value = value
    else:
        setting = AdminSetting(key=key, value=value)
        db.add(setting)

    await db.commit()
    return {"key": key, "value": value}


# ── Coupon Management ─────────────────────────────────────────────────────────

@router.post("/coupons", status_code=status.HTTP_201_CREATED)
async def create_coupon(
    code: str,
    coupon_type: str,
    value: float,
    max_uses: int,
    expires_at: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Create a new coupon."""
    coupon = Coupon(
        code=code.upper(),
        coupon_type=CouponType(coupon_type),
        value=value,
        max_uses=max_uses,
        uses_count=0,
        expires_at=expires_at,
        active=True,
    )
    db.add(coupon)
    await db.commit()
    return coupon


@router.get("/coupons")
async def list_coupons(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """List all coupons."""
    result = await db.execute(select(Coupon).order_by(Coupon.created_at.desc()))
    return list(result.scalars().all())


@router.put("/coupons/{coupon_id}/toggle")
async def toggle_coupon(
    coupon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Toggle coupon active/inactive."""
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    coupon.active = not coupon.active
    await db.commit()
    return {"active": coupon.active}


# ── Platform Revenue ──────────────────────────────────────────────────────────

@router.get("/revenue")
async def get_revenue_report(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
):
    """Get revenue report for the last N days."""
    from datetime import timedelta

    date_from = datetime.utcnow() - timedelta(days=days)

    # Daily revenue
    daily_result = await db.execute(
        select(
            func.date(Call.created_at).label("date"),
            func.count(Call.id).label("calls"),
            func.coalesce(func.sum(Call.cost_usd), 0).label("revenue"),
        )
        .where(Call.created_at >= date_from)
        .group_by(func.date(Call.created_at))
        .order_by(func.date(Call.created_at))
    )

    daily_revenue = [
        {
            "date": str(row.date),
            "calls": row.calls,
            "revenue": round(float(row.revenue), 2),
        }
        for row in daily_result.all()
    ]

    total_revenue = sum(d["revenue"] for d in daily_revenue)
    total_calls = sum(d["calls"] for d in daily_revenue)

    return {
        "period_days": days,
        "total_revenue": round(total_revenue, 2),
        "total_calls": total_calls,
        "avg_revenue_per_call": round(total_revenue / total_calls, 4) if total_calls > 0 else 0,
        "daily_revenue": daily_revenue,
    }