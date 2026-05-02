"""
Call20 — Coupon Model (Phase 4)
Promotional codes for wallet credits and discounts.
"""
import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, String, Integer, Float, DateTime, Enum as SAEnum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class CouponType(str, Enum):
    """Types of coupons."""
    FIXED_AMOUNT = "fixed_amount"    # e.g., $10 credit
    PERCENTAGE = "percentage"        # e.g., 20% of default top-up


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    coupon_type = Column(SAEnum(CouponType), nullable=False)
    value = Column(Float, nullable=False)  # Amount or percentage
    max_uses = Column(Integer, nullable=False, default=100)
    uses_count = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)