"""
Call20 — Auth & Tenant Schemas (Phase 1)
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
import uuid


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=255)
    business_email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone_number: Optional[str] = None
    country: str = Field(..., min_length=2, max_length=2)
    business_category: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 28800  # 8 hours


class RefreshRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str


class TwoFASetupRequest(BaseModel):
    token: str = Field(..., min_length=6, max_length=6)


class TwoFAVerifyRequest(BaseModel):
    token: str = Field(..., min_length=6, max_length=6)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# ── Tenant ────────────────────────────────────────────────────────────────────

class TenantResponse(BaseModel):
    id: uuid.UUID
    name: str
    business_email: str
    phone_number: Optional[str]
    country: str
    business_category: Optional[str]
    plan: str
    wallet_balance: float
    status: str
    free_credits_applied: bool
    coupon_redeemed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TenantUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    business_category: Optional[str] = None
    business_hours: Optional[dict] = None
    logo_url: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    cartesia_api_key: Optional[str] = None


# ── User (Team Members) ──────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_verified: bool
    two_factor_enabled: bool
    last_login_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class InviteUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "viewer"


class UpdateUserRoleRequest(BaseModel):
    role: str


# ── Agent Config ──────────────────────────────────────────────────────────────

class AgentConfigCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    persona_prompt: str = Field(..., min_length=10, max_length=5000)
    greeting_message: Optional[str] = None
    language: str = "en-NG"
    voice_engine: str = "cartesia"
    voice_id: Optional[str] = None
    tools_enabled: list[str] = []
    knowledge_base_ids: list[uuid.UUID] = []
    business_hours: Optional[dict] = None
    after_hours_behavior: str = "voicemail"
    max_call_duration_seconds: int = 600
    sentiment_handoff_threshold: float = 0.3
    fallback_phone: Optional[str] = None
    recording_enabled: bool = True
    pii_redaction_enabled: bool = True


class AgentConfigUpdateRequest(BaseModel):
    name: Optional[str] = None
    persona_prompt: Optional[str] = None
    greeting_message: Optional[str] = None
    language: Optional[str] = None
    voice_engine: Optional[str] = None
    voice_id: Optional[str] = None
    tools_enabled: Optional[list[str]] = None
    knowledge_base_ids: Optional[list[uuid.UUID]] = None
    business_hours: Optional[dict] = None
    after_hours_behavior: Optional[str] = None
    max_call_duration_seconds: Optional[int] = None
    sentiment_handoff_threshold: Optional[float] = None
    fallback_phone: Optional[str] = None
    recording_enabled: Optional[bool] = None
    pii_redaction_enabled: Optional[bool] = None
    active: Optional[bool] = None


class AgentConfigResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    persona_prompt: str
    greeting_message: Optional[str]
    language: str
    voice_engine: str
    voice_id: Optional[str]
    tools_enabled: list[str]
    knowledge_base_ids: list[uuid.UUID]
    business_hours: Optional[dict]
    after_hours_behavior: str
    max_call_duration_seconds: int
    sentiment_handoff_threshold: float
    fallback_phone: Optional[str]
    recording_enabled: bool
    pii_redaction_enabled: bool
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── DID ───────────────────────────────────────────────────────────────────────

class DIDProvisionRequest(BaseModel):
    country: str = Field(..., min_length=2, max_length=2)
    city: Optional[str] = None
    sms_enabled: bool = False
    agent_config_id: Optional[uuid.UUID] = None


class DIDResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    number: str
    didww_id: Optional[str]
    country: str
    city: Optional[str]
    monthly_cost_usd: float
    setup_fee_usd: float
    sms_enabled: bool
    agent_config_id: Optional[uuid.UUID]
    status: str
    renewal_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class DIDUpdateRequest(BaseModel):
    agent_config_id: Optional[uuid.UUID] = None
    sms_enabled: Optional[bool] = None


# ── Knowledge Base ────────────────────────────────────────────────────────────

class KnowledgeBaseCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    source_type: str = Field(..., pattern="^(website|pdf|docx|text|faq)$")
    source_url: Optional[str] = None
    content: Optional[str] = None  # For direct text upload


class KnowledgeBaseResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    source_type: str
    source_url: Optional[str]
    status: str
    page_count: int
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Call ──────────────────────────────────────────────────────────────────────

class CallResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    agent_config_id: Optional[uuid.UUID]
    did_id: Optional[uuid.UUID]
    direction: str
    from_number: Optional[str]
    to_number: Optional[str]
    duration_seconds: int
    cost_usd: float
    sentiment_score: Optional[float]
    resolution: Optional[str]
    handoff_reason: Optional[str]
    recording_url: Optional[str]
    transcript_url: Optional[str]
    summary: Optional[str]
    tools_triggered: list
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class CallFilterParams(BaseModel):
    direction: Optional[str] = None
    resolution: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    page: int = 1
    page_size: int = 50


# ── Transcript ────────────────────────────────────────────────────────────────

class TranscriptResponse(BaseModel):
    id: uuid.UUID
    call_id: uuid.UUID
    content_json: dict
    created_at: datetime

    class Config:
        from_attributes = True


# ── Webhook ───────────────────────────────────────────────────────────────────

class WebhookCreateRequest(BaseModel):
    url: str = Field(..., max_length=500)
    events_subscribed: list[str]
    secret: Optional[str] = None


class WebhookResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    url: str
    events_subscribed: list[str]
    active: bool
    last_delivery_at: Optional[datetime]
    failure_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookUpdateRequest(BaseModel):
    url: Optional[str] = None
    events_subscribed: Optional[list[str]] = None
    active: Optional[bool] = None


# ── SMS ───────────────────────────────────────────────────────────────────────

class SMSMessageResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    call_id: Optional[uuid.UUID]
    direction: str
    to_number: Optional[str]
    from_number: Optional[str]
    content: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SMSSendRequest(BaseModel):
    to_number: str
    content: str = Field(..., min_length=1, max_length=480)


# ── API Key ───────────────────────────────────────────────────────────────────

class APIKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    scope: str = Field(..., pattern="^(read_only|read_write|full)$")


class APIKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str  # Last 4 chars
    scope: str
    created_at: datetime


class APIKeyFullResponse(BaseModel):
    """Returned only at creation time — contains the full key."""
    id: uuid.UUID
    key: str
    name: str
    scope: str
    created_at: datetime