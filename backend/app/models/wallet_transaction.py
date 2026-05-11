"""
Call20 — Wallet Transaction Model (Phase 4)
Tracks all wallet credits and debits.
"""
import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, String, Float, DateTime, Enum as SAEnum, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class TransactionType(str, Enum):
    """Types of wallet transactions."""
    CREDIT = "credit"     # Top-up, coupon, admin credit
    DEBIT = "debit"       # Call cost, subscription


class TransactionSource(str, Enum):
    """Source of wallet transaction."""
    FREE_TRIAL = "free_trial"
    COUPON = "coupon"
    CALL_USAGE = "call_usage"
    MANUAL = "manual"
    EXPIRY = "expiry"


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    type = Column(SAEnum(TransactionType), nullable=False, index=True)
    source = Column(String(50), nullable=True, index=True)
    amount = Column(Float, nullable=False)  # Positive for credit, negative for debit
    balance_before = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    description = Column(String(500), nullable=True)
    reference = Column(String(200), nullable=True, index=True)  # Payment ref, call ID, etc.
    expired = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="wallet_transactions")