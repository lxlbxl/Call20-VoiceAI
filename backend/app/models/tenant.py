"""
Call20 — Tenant & User Models (Phase 1: Core Infrastructure)
Multi-tenant architecture with RBAC.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum as SAEnum, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class TenantStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"
    CLOSED = "closed"


class PlanType(str, enum.Enum):
    STARTER = "starter"
    GROWTH = "growth"
    SCALE = "scale"
    ENTERPRISE = "enterprise"


class UserRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    AGENT_MANAGER = "agent_manager"
    VIEWER = "viewer"
    API_KEY = "api_key"


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    business_email = Column(String(255), unique=True, nullable=False)
    phone_number = Column(String(20), nullable=True)
    country = Column(String(2), nullable=False)  # ISO 3166-1 alpha-2
    business_category = Column(String(100), nullable=True)
    business_hours = Column(JSONB, nullable=True)
    logo_url = Column(String(500), nullable=True)
    plan = Column(SAEnum(PlanType), default=PlanType.STARTER, nullable=False)
    wallet_balance = Column(Numeric(12, 4), default=0.0, nullable=False)

    status = Column(SAEnum(TenantStatus), default=TenantStatus.PENDING_VERIFICATION, nullable=False)
    free_credits_applied = Column(Boolean, default=False, nullable=False)
    coupon_redeemed = Column(Boolean, default=False, nullable=False)
    elevenlabs_api_key_encrypted = Column(String(500), nullable=True)
    cartesia_api_key_encrypted = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    agent_configs = relationship("AgentConfig", back_populates="tenant", cascade="all, delete-orphan")
    dids = relationship("DID", back_populates="tenant", cascade="all, delete-orphan")
    calls = relationship("Call", back_populates="tenant", cascade="all, delete-orphan")
    knowledge_bases = relationship("KnowledgeBase", back_populates="tenant", cascade="all, delete-orphan")
    wallet_transactions = relationship("WalletTransaction", back_populates="tenant", cascade="all, delete-orphan")
    webhooks = relationship("Webhook", back_populates="tenant", cascade="all, delete-orphan")
    sms_messages = relationship("SMSMessage", back_populates="tenant", cascade="all, delete-orphan")
    coupon_redemptions = relationship("CouponRedemption", back_populates="tenant", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String(100), nullable=True)
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String(100), nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")


class AgentConfig(Base):
    __tablename__ = "agent_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    persona_prompt = Column(String(5000), nullable=False)
    greeting_message = Column(String(500), nullable=True)
    language = Column(String(10), default="en-NG", nullable=False)
    voice_engine = Column(String(50), default="cartesia", nullable=False)
    voice_id = Column(String(100), nullable=True)
    tools_enabled = Column(JSONB, default=list, nullable=False)
    knowledge_base_ids = Column(JSONB, default=list, nullable=False)
    business_hours = Column(JSONB, nullable=True)
    after_hours_behavior = Column(String(50), default="voicemail", nullable=False)
    max_call_duration_seconds = Column(Integer, default=600, nullable=False)
    sentiment_handoff_threshold = Column(Float, default=0.3, nullable=False)
    fallback_phone = Column(String(20), nullable=True)
    recording_enabled = Column(Boolean, default=True, nullable=False)
    pii_redaction_enabled = Column(Boolean, default=True, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="agent_configs")
    dids = relationship("DID", back_populates="agent_config")
    calls = relationship("Call", back_populates="agent_config")


class DID(Base):
    __tablename__ = "dids"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    number = Column(String(20), unique=True, nullable=False)
    didww_id = Column(String(100), nullable=True)
    country = Column(String(2), nullable=False)
    city = Column(String(100), nullable=True)
    monthly_cost_usd = Column(Float, default=0.0, nullable=False)
    setup_fee_usd = Column(Float, default=0.0, nullable=False)
    sms_enabled = Column(Boolean, default=False, nullable=False)
    agent_config_id = Column(UUID(as_uuid=True), ForeignKey("agent_configs.id"), nullable=True)
    status = Column(String(20), default="active", nullable=False)
    renewal_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="dids")
    agent_config = relationship("AgentConfig", back_populates="dids")
    calls = relationship("Call", back_populates="did")


class Call(Base):
    __tablename__ = "calls"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    agent_config_id = Column(UUID(as_uuid=True), ForeignKey("agent_configs.id"), nullable=True)
    did_id = Column(UUID(as_uuid=True), ForeignKey("dids.id"), nullable=True)
    direction = Column(String(10), default="inbound", nullable=False)  # inbound | outbound
    from_number = Column(String(20), nullable=True)
    to_number = Column(String(20), nullable=True)
    duration_seconds = Column(Integer, default=0, nullable=False)
    cost_usd = Column(Float, default=0.0, nullable=False)
    sentiment_score = Column(Float, nullable=True)
    resolution = Column(String(20), nullable=True)  # resolved | escalated | unresolved
    handoff_reason = Column(String(200), nullable=True)
    recording_url = Column(String(500), nullable=True)
    transcript_url = Column(String(500), nullable=True)
    summary = Column(String(2000), nullable=True)
    tools_triggered = Column(JSONB, default=list, nullable=False)
    status = Column(String(20), default="completed", nullable=False)  # completed | failed | abnormal_termination
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="calls")
    agent_config = relationship("AgentConfig", back_populates="calls")
    did = relationship("DID", back_populates="calls")
    transcripts = relationship("Transcript", back_populates="call", cascade="all, delete-orphan")
    sms_messages = relationship("SMSMessage", back_populates="call")


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    call_id = Column(UUID(as_uuid=True), ForeignKey("calls.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    content_json = Column(JSONB, nullable=False)  # Full transcript with timestamps + diarization
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    call = relationship("Call", back_populates="transcripts")


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    source_type = Column(String(20), nullable=False)  # website | pdf | docx | text | faq
    source_url = Column(String(500), nullable=True)
    status = Column(String(20), default="pending", nullable=False)  # pending | processing | ready | failed
    page_count = Column(Integer, default=0, nullable=False)
    error_message = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="knowledge_bases")
    chunks = relationship("KBChunk", back_populates="knowledge_base", cascade="all, delete-orphan")


class KBChunk(Base):
    __tablename__ = "kb_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kb_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    content = Column(String(2000), nullable=False)
    embedding = Column(String(10000), nullable=True)  # pgvector stored as text, cast at query time
    source_url = Column(String(500), nullable=True)
    page_number = Column(Integer, nullable=True)
    ingested_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    knowledge_base = relationship("KnowledgeBase", back_populates="chunks")


class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    url = Column(String(500), nullable=False)
    events_subscribed = Column(JSONB, default=list, nullable=False)
    secret = Column(String(100), nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    last_delivery_at = Column(DateTime, nullable=True)
    failure_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="webhooks")
    deliveries = relationship("WebhookDelivery", back_populates="webhook", cascade="all, delete-orphan")


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    webhook_id = Column(UUID(as_uuid=True), ForeignKey("webhooks.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)
    status_code = Column(Integer, nullable=True)
    request_payload = Column(JSONB, nullable=True)
    response_body = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    webhook = relationship("Webhook", back_populates="deliveries")
    tenant = relationship("Tenant", backref="webhook_deliveries")


class DailyTenantMetric(Base):
    __tablename__ = "daily_tenant_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    date = Column(DateTime, nullable=False, index=True)
    total_calls = Column(Integer, default=0)
    total_duration_seconds = Column(Integer, default=0)
    total_cost_usd = Column(Numeric(12, 4), default=0)
    avg_sentiment = Column(Float, nullable=True)
    handoff_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", backref="daily_metrics")


class SMSMessage(Base):
    __tablename__ = "sms_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    call_id = Column(UUID(as_uuid=True), ForeignKey("calls.id"), nullable=True)
    direction = Column(String(10), default="outbound", nullable=False)  # inbound | outbound
    to_number = Column(String(20), nullable=True)
    from_number = Column(String(20), nullable=True)
    content = Column(String(500), nullable=False)
    status = Column(String(20), default="queued", nullable=False)  # queued | sent | delivered | failed
    didww_message_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="sms_messages")
    call = relationship("Call", back_populates="sms_messages")