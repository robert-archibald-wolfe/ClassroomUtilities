"""Roster management routes.

IMPORTANT: Rosters contain PHI (student names). All roster data received
from the client is already encrypted. The server stores only encrypted blobs.
"""

from pydantic import BaseModel
from fastapi import APIRouter

from app.api.deps import CurrentTenantId, CurrentUserId

router = APIRouter()


# --- Schemas ---


class RosterCreate(BaseModel):
    """Create roster request - data is encrypted client-side."""
    name: str  # Roster name (e.g., "Period 1 - World History") - NOT PHI
    encrypted_data: str  # Encrypted student list (base64)
    encryption_iv: str  # Initialization vector for decryption (base64)


class RosterUpdate(BaseModel):
    """Update roster request."""
    name: str | None = None
    encrypted_data: str | None = None
    encryption_iv: str | None = None


class RosterResponse(BaseModel):
    """Roster response - encrypted data returned as-is."""
    id: str
    name: str
    encrypted_data: str
    encryption_iv: str
    created_at: str
    updated_at: str


# --- Temporary in-memory store (replace with DB) ---

_rosters_db: dict[str, dict] = {}


# --- Routes ---


@router.get("", response_model=list[RosterResponse])
async def list_rosters(
    tenant_id: CurrentTenantId,
) -> list[RosterResponse]:
    """List all rosters for the current tenant."""
    # TODO: Query database filtered by tenant_id
    return [
        RosterResponse(**r)
        for r in _rosters_db.values()
        if r.get("tenant_id") == tenant_id
    ]


@router.post("", response_model=RosterResponse, status_code=201)
async def create_roster(
    roster: RosterCreate,
    tenant_id: CurrentTenantId,
    user_id: CurrentUserId,
) -> RosterResponse:
    """
    Create a new roster.

    The encrypted_data field contains the student list encrypted client-side.
    The server never decrypts this data.
    """
    import uuid
    from datetime import datetime, timezone

    roster_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    roster_record = {
        "id": roster_id,
        "tenant_id": tenant_id,
        "created_by": user_id,
        "name": roster.name,
        "encrypted_data": roster.encrypted_data,
        "encryption_iv": roster.encryption_iv,
        "created_at": now,
        "updated_at": now,
    }

    _rosters_db[roster_id] = roster_record

    return RosterResponse(**roster_record)


@router.get("/{roster_id}", response_model=RosterResponse)
async def get_roster(
    roster_id: str,
    tenant_id: CurrentTenantId,
) -> RosterResponse:
    """Get a specific roster by ID."""
    from fastapi import HTTPException, status

    roster = _rosters_db.get(roster_id)
    if not roster or roster.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Roster not found",
        )

    return RosterResponse(**roster)


@router.put("/{roster_id}", response_model=RosterResponse)
async def update_roster(
    roster_id: str,
    update: RosterUpdate,
    tenant_id: CurrentTenantId,
) -> RosterResponse:
    """Update a roster."""
    from datetime import datetime, timezone
    from fastapi import HTTPException, status

    roster = _rosters_db.get(roster_id)
    if not roster or roster.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Roster not found",
        )

    # Update fields
    if update.name is not None:
        roster["name"] = update.name
    if update.encrypted_data is not None:
        roster["encrypted_data"] = update.encrypted_data
    if update.encryption_iv is not None:
        roster["encryption_iv"] = update.encryption_iv

    roster["updated_at"] = datetime.now(timezone.utc).isoformat()

    return RosterResponse(**roster)


@router.delete("/{roster_id}", status_code=204)
async def delete_roster(
    roster_id: str,
    tenant_id: CurrentTenantId,
) -> None:
    """Delete a roster."""
    from fastapi import HTTPException, status

    roster = _rosters_db.get(roster_id)
    if not roster or roster.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Roster not found",
        )

    del _rosters_db[roster_id]
