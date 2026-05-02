"""
Call20 — API Key API (Phase 1)
API key generation, listing, and revocation for Scale/Enterprise plans.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.services.api_key_service import create_api_key, list_api_keys, revoke_api_key, authenticate_api_key
from app.schemas.auth import APIKeyCreateRequest, APIKeyResponse, APIKeyFullResponse
from app.models.tenant import User

router = APIRouter(prefix="/api/v1/api-keys", tags=["API Keys"])


@router.post("/", response_model=APIKeyFullResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key_endpoint(
    request: APIKeyCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new API key (Scale/Enterprise only)."""
    api_key_user, full_key = await create_api_key(
        db=db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        name=request.name,
        scope=request.scope,
    )
    await db.commit()

    return APIKeyFullResponse(
        id=api_key_user.id,
        key=full_key,
        name=api_key_user.full_name,
        scope=request.scope,
        created_at=api_key_user.created_at,
    )


@router.get("/", response_model=list[APIKeyResponse])
async def list_api_keys_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all API keys for the tenant."""
    keys = await list_api_keys(db, current_user.tenant_id)
    return [
        APIKeyResponse(
            id=key.id,
            name=key.full_name,
            key_prefix=key.email.split("@")[0].replace("apikey_", "")[-4:],
            scope="full",  # In production, store scope separately
            created_at=key.created_at,
        )
        for key in keys
    ]


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key_endpoint(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke an API key."""
    await revoke_api_key(db, key_id, current_user.tenant_id)
    await db.commit()


# ── API Key Authentication Endpoint ──────────────────────────────────────────

@router.get("/authenticate")
async def authenticate_api_key_endpoint(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Authenticate using an API key (for programmatic access)."""
    # Extract key from Authorization header
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    api_key = authorization[7:]
    user = await authenticate_api_key(db, api_key)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return {
        "tenant_id": str(user.tenant_id),
        "role": user.role.value,
        "authenticated": True,
    }