"""
Call20 — All database models (imported for Alembic auto-generation)
"""
from app.core.database import Base

# Phase 1: Core Infrastructure
from app.models.tenant import (
    Tenant,
    User,
    AgentConfig,
    DID,
    Call,
    Transcript,
    KnowledgeBase,
    KBChunk,
    Webhook,
    SMSMessage,
    TenantStatus,
    PlanType,
    UserRole,
)

# Phase 3: Admin & Audit
from app.models.admin_setting import AdminSetting
from app.models.audit_log import AuditLog, AuditAction

# Phase 4: Financial & Promotional
from app.models.wallet_transaction import WalletTransaction, TransactionType
from app.models.coupon import Coupon, CouponType

__all__ = [
    "Base",
    "Tenant",
    "User",
    "AgentConfig",
    "DID",
    "Call",
    "Transcript",
    "KnowledgeBase",
    "KBChunk",
    "Webhook",
    "SMSMessage",
    "TenantStatus",
    "PlanType",
    "UserRole",
    "AdminSetting",
    "AuditLog",
    "AuditAction",
    "WalletTransaction",
    "TransactionType",
    "Coupon",
    "CouponType",
]
