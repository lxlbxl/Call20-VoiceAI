"""
Call20 — Admin Settings Service Layer (PRD v7.1)
Manages global admin-configurable settings with JSON serialization.
"""
import json
import uuid
from typing import Optional, Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_setting import AdminSetting
from app.models.audit_log import AuditLog
from app.core.config import get_settings

settings = get_settings()

# Default settings keys
SETTING_FREE_TRIAL_ENABLED = "free_trial_enabled"
SETTING_FREE_TRIAL_AMOUNT_USD = "free_trial_amount_usd"
SETTING_FREE_TRIAL_EXPIRY_DAYS = "free_trial_expiry_days"
SETTING_COUPON_CREDIT_EXPIRY_DAYS = "coupon_credit_expiry_days"
SETTING_ALLOW_COUPON_STACKING = "allow_coupon_stacking"


class AdminSettingsService:
    """Service for managing admin settings"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_setting(self, key: str) -> Optional[str]:
        """Get a single setting value by key"""
        result = await self.db.execute(
            select(AdminSetting).where(AdminSetting.key == key)
        )
        setting = result.scalar_one_or_none()
        return setting.value if setting else None

    async def get_setting_value(self, key: str, default: Any = None) -> Any:
        """Get a setting value, deserialized from JSON"""
        raw = await self.get_setting(key)
        if raw is None:
            return default
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw

    async def set_setting(self, key: str, value: Any, updated_by: Optional[uuid.UUID] = None) -> AdminSetting:
        """Create or update a setting"""
        serialized = json.dumps(value) if not isinstance(value, str) else value

        result = await self.db.execute(
            select(AdminSetting).where(AdminSetting.key == key)
        )
        setting = result.scalar_one_or_none()

        if setting:
            setting.value = serialized
            setting.updated_by = updated_by
        else:
            setting = AdminSetting(
                key=key,
                value=serialized,
                updated_by=updated_by,
            )
            self.db.add(setting)

        # Audit log
        audit = AuditLog(
            action="setting.updated",
            resource_type="admin_setting",
            details_json={"key": key, "value": str(value)},
        )
        self.db.add(audit)

        await self.db.commit()
        await self.db.refresh(setting)
        return setting

    async def get_free_credit_settings(self) -> Dict[str, Any]:
        """Get all free credit settings with defaults from config"""
        return {
            "free_trial_enabled": await self.get_setting_value(
                SETTING_FREE_TRIAL_ENABLED, settings.FREE_TRIAL_ENABLED
            ),
            "free_trial_amount_usd": await self.get_setting_value(
                SETTING_FREE_TRIAL_AMOUNT_USD, settings.DEFAULT_FREE_TRIAL_AMOUNT
            ),
            "free_trial_expiry_days": await self.get_setting_value(
                SETTING_FREE_TRIAL_EXPIRY_DAYS, settings.DEFAULT_FREE_TRIAL_EXPIRY_DAYS
            ),
            "coupon_credit_expiry_days": await self.get_setting_value(
                SETTING_COUPON_CREDIT_EXPIRY_DAYS, settings.DEFAULT_COUPON_CREDIT_EXPIRY_DAYS
            ),
            "allow_coupon_stacking": await self.get_setting_value(
                SETTING_ALLOW_COUPON_STACKING, settings.ALLOW_COUPON_STACKING
            ),
        }

    async def update_free_credit_settings(
        self,
        free_trial_enabled: Optional[bool] = None,
        free_trial_amount_usd: Optional[float] = None,
        free_trial_expiry_days: Optional[int] = None,
        coupon_credit_expiry_days: Optional[int] = None,
        allow_coupon_stacking: Optional[bool] = None,
        updated_by: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """Update one or more free credit settings"""
        if free_trial_enabled is not None:
            await self.set_setting(SETTING_FREE_TRIAL_ENABLED, free_trial_enabled, updated_by)
        if free_trial_amount_usd is not None:
            await self.set_setting(SETTING_FREE_TRIAL_AMOUNT_USD, free_trial_amount_usd, updated_by)
        if free_trial_expiry_days is not None:
            await self.set_setting(SETTING_FREE_TRIAL_EXPIRY_DAYS, free_trial_expiry_days, updated_by)
        if coupon_credit_expiry_days is not None:
            await self.set_setting(SETTING_COUPON_CREDIT_EXPIRY_DAYS, coupon_credit_expiry_days, updated_by)
        if allow_coupon_stacking is not None:
            await self.set_setting(SETTING_ALLOW_COUPON_STACKING, allow_coupon_stacking, updated_by)

        return await self.get_free_credit_settings()

    async def get_all_settings(self) -> list[AdminSetting]:
        """Get all admin settings"""
        result = await self.db.execute(
            select(AdminSetting).order_by(AdminSetting.key)
        )
        return list(result.scalars().all())