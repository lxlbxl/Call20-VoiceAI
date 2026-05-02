"""
Call20 — DID API (Phase 1)
DID provisioning, listing, updating, and release.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.services.did_service import provision_did, list_dids, get_did, update_did, release_did
from app.schemas.auth import DIDProvisionRequest, DIDResponse, DIDUpdateRequest
from app.models.tenant import User

router = APIRouter(prefix="/api/v1/dids", tags=["DIDs"])


@router.post("/", response_model=DIDResponse, status_code=status.HTTP_201_CREATED)
async def create_did(
    request: DIDProvisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Provision a new DID number."""
    did = await provision_did(
        db=db,
        tenant_id=current_user.tenant_id,
        country=request.country,
        city=request.city,
        sms_enabled=request.sms_enabled,
        agent_config_id=request.agent_config_id,
    )
    await db.commit()
    return did


@router.get("/", response_model=list[DIDResponse])
async def list_my_dids(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all DIDs for the current tenant."""
    return await list_dids(db, current_user.tenant_id)


@router.get("/{did_id}", response_model=DIDResponse)
async def get_did_by_id(
    did_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific DID."""
    did = await get_did(db, did_id, current_user.tenant_id)
    if not did:
        raise HTTPException(status_code=404, detail="DID not found")
    return did


@router.put("/{did_id}", response_model=DIDResponse)
async def update_did_by_id(
    did_id: uuid.UUID,
    request: DIDUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update DID configuration."""
    did = await update_did(
        db=db,
        did_id=did_id,
        tenant_id=current_user.tenant_id,
        agent_config_id=request.agent_config_id,
        sms_enabled=request.sms_enabled,
    )
    await db.commit()
    return did


@router.delete("/{did_id}", status_code=status.HTTP_204_NO_CONTENT)
async def release_did_by_id(
    did_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Release a DID number."""
    await release_did(db, did_id, current_user.tenant_id)
    await db.commit()