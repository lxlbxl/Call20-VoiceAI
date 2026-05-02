"""
Call20 — Audit Log Model (Phase 3)
Tracks all admin actions for compliance and debugging.
"""
import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, String, Text, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class AuditAction(str, Enum):
    """Types of auditable actions."""
    TENANT_CREATED = "tenant.created"
    TENANT_UPDATED = "tenant.updated"
    TENANT_SUSPENDED = "tenant.suspended"
    TENANT_REACTIVATED = "tenant.reactivated"
    USER_INVITED = "user.invited"
    USER_REMOVED = "user.removed"
    DID_PROVISIONED = "did.provisioned"
    DID_RELEASED = "did.released"
    AGENT_CREATED = "agent.created"
    AGENT_UPDATED = "agent.updated"
    KB_CREATED = "kb.created"
    KB_DELETED = "kb.deleted"
    WEBHOOK_CREATED = "webhook.created"
    WEBHOOK_DISABLED = "webhook.disabled"
    WALLET_TOPUP = "wallet.topup"
    WALLET_DEBIT = "wallet.debit"
    COUPON_CREATED = "coupon.created"
    COUPON_REDEEMED = "coupon.redeemed"
    API_KEY_CREATED = "api_key.created"
    API_KEY_REVOKED = "api_key.revoked"
    ADMIN_LOGIN = "admin.login"
    ADMIN_SETTING_CHANGED = "admin.setting_changed"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(SAEnum(AuditAction), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", backref="audit_logs")
    user = relationship("User", backref="audit_logs")