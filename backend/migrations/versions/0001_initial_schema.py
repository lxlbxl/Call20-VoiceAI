"""Initial schema — all tables

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-20 00:00:00.000000
"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enums ─────────────────────────────────────────────────────────────────
    tenant_status = postgresql.ENUM(
        "active", "suspended", "pending_verification", "closed",
        name="tenantstatus", create_type=True,
    )
    plan_type = postgresql.ENUM(
        "starter", "growth", "scale", "enterprise",
        name="plantype", create_type=True,
    )
    user_role = postgresql.ENUM(
        "SUPER_ADMIN", "owner", "admin", "agent_manager", "viewer", "api_key",
        name="userrole", create_type=True,
    )
    transaction_type = postgresql.ENUM(
        "credit", "debit",
        name="transactiontype", create_type=True,
    )
    coupon_type = postgresql.ENUM(
        "fixed_amount", "percentage",
        name="coupontype", create_type=True,
    )
    audit_action = postgresql.ENUM(
        "login", "logout", "register", "create_agent", "update_agent",
        "delete_agent", "create_did", "delete_did", "create_kb",
        "delete_kb", "topup_wallet", "redeem_coupon", "update_settings",
        "suspend_tenant", "activate_tenant",
        name="auditaction", create_type=True,
    )
    for e in [tenant_status, plan_type, user_role, transaction_type, coupon_type, audit_action]:
        e.create(op.get_bind(), checkfirst=True)

    # ── tenants ───────────────────────────────────────────────────────────────
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("business_email", sa.String(255), unique=True, nullable=False),
        sa.Column("phone_number", sa.String(20), nullable=True),
        sa.Column("country", sa.String(2), nullable=False),
        sa.Column("business_category", sa.String(100), nullable=True),
        sa.Column("business_hours", postgresql.JSONB, nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("plan", sa.Enum("starter", "growth", "scale", "enterprise", name="plantype"), nullable=False, server_default="starter"),
        sa.Column("wallet_balance", sa.Numeric(12, 4), nullable=False, server_default="0"),
        sa.Column("status", sa.Enum("active", "suspended", "pending_verification", "closed", name="tenantstatus"), nullable=False, server_default="pending_verification"),
        sa.Column("free_credits_applied", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("coupon_redeemed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("elevenlabs_api_key_encrypted", sa.String(500), nullable=True),
        sa.Column("cartesia_api_key_encrypted", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("SUPER_ADMIN", "owner", "admin", "agent_manager", "viewer", "api_key", name="userrole"), nullable=False, server_default="viewer"),
        sa.Column("is_verified", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("verification_token", sa.String(100), nullable=True),
        sa.Column("two_factor_enabled", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("two_factor_secret", sa.String(100), nullable=True),
        sa.Column("last_login_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ── agent_configs ─────────────────────────────────────────────────────────
    op.create_table(
        "agent_configs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("persona_prompt", sa.String(5000), nullable=False),
        sa.Column("greeting_message", sa.String(500), nullable=True),
        sa.Column("language", sa.String(10), nullable=False, server_default="en-NG"),
        sa.Column("voice_engine", sa.String(50), nullable=False, server_default="cartesia"),
        sa.Column("voice_id", sa.String(100), nullable=True),
        sa.Column("tools_enabled", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("knowledge_base_ids", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("business_hours", postgresql.JSONB, nullable=True),
        sa.Column("after_hours_behavior", sa.String(50), nullable=False, server_default="voicemail"),
        sa.Column("max_call_duration_seconds", sa.Integer, nullable=False, server_default="600"),
        sa.Column("sentiment_handoff_threshold", sa.Float, nullable=False, server_default="0.3"),
        sa.Column("fallback_phone", sa.String(20), nullable=True),
        sa.Column("recording_enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("pii_redaction_enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── dids ──────────────────────────────────────────────────────────────────
    op.create_table(
        "dids",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("number", sa.String(20), unique=True, nullable=False),
        sa.Column("didww_id", sa.String(100), nullable=True),
        sa.Column("country", sa.String(2), nullable=False),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("monthly_cost_usd", sa.Float, nullable=False, server_default="0"),
        sa.Column("setup_fee_usd", sa.Float, nullable=False, server_default="0"),
        sa.Column("sms_enabled", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("agent_config_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_configs.id"), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("renewal_date", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── calls ─────────────────────────────────────────────────────────────────
    op.create_table(
        "calls",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("agent_config_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_configs.id"), nullable=True),
        sa.Column("did_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("dids.id"), nullable=True),
        sa.Column("direction", sa.String(10), nullable=False, server_default="inbound"),
        sa.Column("from_number", sa.String(20), nullable=True),
        sa.Column("to_number", sa.String(20), nullable=True),
        sa.Column("duration_seconds", sa.Integer, nullable=False, server_default="0"),
        sa.Column("cost_usd", sa.Float, nullable=False, server_default="0"),
        sa.Column("sentiment_score", sa.Float, nullable=True),
        sa.Column("resolution", sa.String(20), nullable=True),
        sa.Column("handoff_reason", sa.String(200), nullable=True),
        sa.Column("recording_url", sa.String(500), nullable=True),
        sa.Column("transcript_url", sa.String(500), nullable=True),
        sa.Column("summary", sa.String(2000), nullable=True),
        sa.Column("tools_triggered", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("status", sa.String(20), nullable=False, server_default="completed"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_calls_tenant_created", "calls", ["tenant_id", "created_at"])

    # ── transcripts ───────────────────────────────────────────────────────────
    op.create_table(
        "transcripts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("call_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("calls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content_json", postgresql.JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── knowledge_bases ───────────────────────────────────────────────────────
    op.create_table(
        "knowledge_bases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("source_type", sa.String(20), nullable=False),
        sa.Column("source_url", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("page_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error_message", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── kb_chunks ─────────────────────────────────────────────────────────────
    op.create_table(
        "kb_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("kb_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.String(2000), nullable=False),
        sa.Column("embedding", sa.String(10000), nullable=True),
        sa.Column("source_url", sa.String(500), nullable=True),
        sa.Column("page_number", sa.Integer, nullable=True),
        sa.Column("ingested_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── webhooks ──────────────────────────────────────────────────────────────
    op.create_table(
        "webhooks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("events_subscribed", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("secret", sa.String(100), nullable=False),
        sa.Column("active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("last_delivery_at", sa.DateTime, nullable=True),
        sa.Column("failure_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── webhook_deliveries ────────────────────────────────────────────────────
    op.create_table(
        "webhook_deliveries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("webhook_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("webhooks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("status_code", sa.Integer, nullable=True),
        sa.Column("request_payload", postgresql.JSONB, nullable=True),
        sa.Column("response_body", sa.Text, nullable=True),
        sa.Column("duration_ms", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── sms_messages ──────────────────────────────────────────────────────────
    op.create_table(
        "sms_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("call_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("calls.id"), nullable=True),
        sa.Column("direction", sa.String(10), nullable=False, server_default="outbound"),
        sa.Column("to_number", sa.String(20), nullable=True),
        sa.Column("from_number", sa.String(20), nullable=True),
        sa.Column("content", sa.String(500), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("didww_message_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── wallet_transactions ───────────────────────────────────────────────────
    op.create_table(
        "wallet_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.Enum("credit", "debit", name="transactiontype"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 4), nullable=False),
        sa.Column("balance_before", sa.Numeric(12, 4), nullable=False),
        sa.Column("balance_after", sa.Numeric(12, 4), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("reference", sa.String(255), nullable=True),
        sa.Column("expired", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_wallet_tx_tenant", "wallet_transactions", ["tenant_id", "created_at"])

    # ── coupons ───────────────────────────────────────────────────────────────
    op.create_table(
        "coupons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("code", sa.String(50), unique=True, nullable=False),
        sa.Column("coupon_type", sa.Enum("fixed_amount", "percentage", name="coupontype"), nullable=False),
        sa.Column("value", sa.Float, nullable=False),
        sa.Column("max_uses", sa.Integer, nullable=False),
        sa.Column("uses_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime, nullable=True),
        sa.Column("active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── coupon_redemptions ────────────────────────────────────────────────────
    op.create_table(
        "coupon_redemptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("coupon_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("coupons.id"), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount_credited", sa.Float, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── audit_logs ────────────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.Enum(
            "login", "logout", "register", "create_agent", "update_agent",
            "delete_agent", "create_did", "delete_did", "create_kb",
            "delete_kb", "topup_wallet", "redeem_coupon", "update_settings",
            "suspend_tenant", "activate_tenant",
            name="auditaction"), nullable=False),
        sa.Column("resource_type", sa.String(50), nullable=True),
        sa.Column("resource_id", sa.String(100), nullable=True),
        sa.Column("details", postgresql.JSONB, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_tenant", "audit_logs", ["tenant_id", "created_at"])

    # ── admin_settings ────────────────────────────────────────────────────────
    op.create_table(
        "admin_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("key", sa.String(100), unique=True, nullable=False),
        sa.Column("value", sa.Text, nullable=True),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # ── daily_tenant_metrics ──────────────────────────────────────────────────
    op.create_table(
        "daily_tenant_metrics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.DateTime, nullable=False, index=True),
        sa.Column("total_calls", sa.Integer, server_default="0"),
        sa.Column("total_duration_seconds", sa.Integer, server_default="0"),
        sa.Column("total_cost_usd", sa.Numeric(12, 4), server_default="0"),
        sa.Column("avg_sentiment", sa.Float, nullable=True),
        sa.Column("handoff_count", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("daily_tenant_metrics")
    op.drop_table("admin_settings")
    op.drop_table("audit_logs")
    op.drop_table("coupon_redemptions")
    op.drop_table("coupons")
    op.drop_table("wallet_transactions")
    op.drop_table("sms_messages")
    op.drop_table("webhook_deliveries")
    op.drop_table("webhooks")
    op.drop_table("kb_chunks")
    op.drop_table("knowledge_bases")
    op.drop_table("transcripts")
    op.drop_table("calls")
    op.drop_table("dids")
    op.drop_table("agent_configs")
    op.drop_table("users")
    op.drop_table("tenants")

    for enum_name in ["auditaction", "coupontype", "transactiontype", "userrole", "plantype", "tenantstatus"]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
