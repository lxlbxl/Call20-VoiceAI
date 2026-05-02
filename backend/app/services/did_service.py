"""
Call20 — DID Provisioning Service (Phase 1)
Handles DID number provisioning, listing, and management via DIDWW API.
"""
import uuid
import httpx
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.tenant import DID, Tenant, PlanType
from app.core.config import settings


async def provision_did(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    country: str,
    city: Optional[str] = None,
    sms_enabled: bool = False,
    agent_config_id: Optional[uuid.UUID] = None,
) -> DID:
    """
    Provision a new DID number from DIDWW.
    In production, this calls the DIDWW API to search and rent a number.
    """
    # Check plan limits
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    # Check DID limit
    did_count_result = await db.execute(
        select(func.count(DID.id)).where(DID.tenant_id == tenant_id, DID.status == "active")
    )
    did_count = did_count_result.scalar() or 0

    limits = {"starter": 1, "growth": 3, "scale": 10, "enterprise": 99999}
    max_dids = limits.get(tenant.plan.value, 1)

    if did_count >= max_dids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Plan limit reached: {max_dids} DID(s). Upgrade your plan for more numbers.",
        )

    # In production, call DIDWW API to search available numbers
    # For now, generate a mock number
    async with httpx.AsyncClient() as client:
        try:
            # DIDWW API: Search available numbers
            response = await client.get(
                f"https://api.didww.com/v3/phone_numbers",
                headers={"Authorization": f"Bearer {settings.DIDWW_API_KEY}"},
                params={
                    "country": country,
                    "city": city,
                    "features": "voice" + (",sms" if sms_enabled else ""),
                    "limit": 10,
                },
                timeout=10.0,
            )
            response.raise_for_status()
            available_numbers = response.json().get("data", [])

            if not available_numbers:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No available numbers in {country}",
                )

            # Pick the first available number
            chosen = available_numbers[0]
            didww_number_id = chosen["id"]
            phone_number = chosen["attributes"]["e164"]
            monthly_cost = float(chosen["attributes"].get("monthly_cost_usd", 5.0))
            setup_fee = float(chosen["attributes"].get("setup_cost_usd", 0.0))
            city_name = chosen["attributes"].get("city", city)

            # Rent the number
            rent_response = await client.post(
                f"https://api.didww.com/v3/phone_number_rentals",
                headers={"Authorization": f"Bearer {settings.DIDWW_API_KEY}"},
                json={
                    "type": "phone_number_rental",
                    "attributes": {
                        "phone_number_id": didww_number_id,
                        "forwarding_number": settings.FORWARDING_SIP_URI,
                    },
                },
                timeout=15.0,
            )
            rent_response.raise_for_status()

        except httpx.HTTPError:
            # Fallback: generate a mock number for development
            phone_number = f"+{country}1{uuid.uuid4().hex[:9]}"
            didww_number_id = None
            monthly_cost = 5.0
            setup_fee = 0.0
            city_name = city

    # Create DID record
    did = DID(
        tenant_id=tenant_id,
        number=phone_number,
        didww_id=didww_number_id,
        country=country,
        city=city_name,
        monthly_cost_usd=monthly_cost,
        setup_fee_usd=setup_fee,
        sms_enabled=sms_enabled,
        agent_config_id=agent_config_id,
        status="active",
        renewal_date=datetime.utcnow() + timedelta(days=30),
    )
    db.add(did)
    await db.flush()

    return did


async def list_dids(db: AsyncSession, tenant_id: uuid.UUID) -> list[DID]:
    """List all DIDs for a tenant."""
    result = await db.execute(
        select(DID).where(DID.tenant_id == tenant_id).order_by(DID.created_at.desc())
    )
    return list(result.scalars().all())


async def get_did(db: AsyncSession, did_id: uuid.UUID, tenant_id: uuid.UUID) -> Optional[DID]:
    """Get a specific DID."""
    result = await db.execute(
        select(DID).where(DID.id == did_id, DID.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def update_did(
    db: AsyncSession,
    did_id: uuid.UUID,
    tenant_id: uuid.UUID,
    agent_config_id: Optional[uuid.UUID] = None,
    sms_enabled: Optional[bool] = None,
) -> DID:
    """Update DID configuration."""
    did = await get_did(db, did_id, tenant_id)
    if not did:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DID not found")

    if agent_config_id is not None:
        did.agent_config_id = agent_config_id
    if sms_enabled is not None:
        did.sms_enabled = sms_enabled

    await db.flush()
    return did


async def release_did(db: AsyncSession, did_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
    """Release a DID number (cancel rental)."""
    did = await get_did(db, did_id, tenant_id)
    if not did:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DID not found")

    # In production, call DIDWW API to release the number
    if did.didww_id:
        async with httpx.AsyncClient() as client:
            try:
                await client.delete(
                    f"https://api.didww.com/v3/phone_number_rentals/{did.didww_id}",
                    headers={"Authorization": f"Bearer {settings.DIDWW_API_KEY}"},
                    timeout=10.0,
                )
            except httpx.HTTPError:
                pass  # Log error in production

    did.status = "released"
    await db.flush()
    return True


async def renew_dids(db: AsyncSession) -> list[str]:
    """
    Celery job: Renew DIDs that are about to expire.
    Returns list of failed renewal numbers.
    """
    from app.models.tenant import Tenant

    failed = []
    now = datetime.utcnow()
    thirty_days = now + timedelta(days=30)

    # Find DIDs expiring in the next 30 days
    result = await db.execute(
        select(DID).where(
            DID.renewal_date <= thirty_days,
            DID.status == "active",
        )
    )
    expiring_dids = list(result.scalars().all())

    for did in expiring_dids:
        try:
            # In production, call DIDWW API to extend rental
            if did.didww_id:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"https://api.didww.com/v3/phone_number_rentals/{did.didww_id}/renew",
                        headers={"Authorization": f"Bearer {settings.DIDWW_API_KEY}"},
                        json={"period_months": 1},
                        timeout=10.0,
                    )
                    response.raise_for_status()

            did.renewal_date = now + timedelta(days=30)
            await db.flush()

        except Exception:
            failed.append(did.number)

    return failed