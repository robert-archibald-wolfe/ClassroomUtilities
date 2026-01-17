"""Seating chart routes.

IMPORTANT: Seating charts contain PHI (student name/seat mappings).
Position data linking students to seats is encrypted client-side.
"""

from pydantic import BaseModel
from fastapi import APIRouter

from app.api.deps import CurrentTenantId, CurrentUserId

router = APIRouter()


# --- Schemas ---


class LayoutConfig(BaseModel):
    """Room layout configuration (not PHI)."""
    type: str  # "grid", "pods", "u-shape", "custom"
    rows: int | None = None
    cols: int | None = None
    custom_positions: list[dict] | None = None  # For custom layouts


class SeatingChartCreate(BaseModel):
    """Create seating chart request."""
    name: str
    roster_id: str
    layout: LayoutConfig
    encrypted_positions: str  # Encrypted seat assignments (base64)
    encryption_iv: str


class SeatingChartUpdate(BaseModel):
    """Update seating chart request."""
    name: str | None = None
    layout: LayoutConfig | None = None
    encrypted_positions: str | None = None
    encryption_iv: str | None = None


class SeatingChartResponse(BaseModel):
    """Seating chart response."""
    id: str
    name: str
    roster_id: str
    layout: LayoutConfig
    encrypted_positions: str
    encryption_iv: str
    created_at: str
    updated_at: str


# --- Temporary in-memory store ---

_charts_db: dict[str, dict] = {}


# --- Routes ---


@router.get("", response_model=list[SeatingChartResponse])
async def list_seating_charts(
    tenant_id: CurrentTenantId,
    roster_id: str | None = None,
) -> list[SeatingChartResponse]:
    """List seating charts, optionally filtered by roster."""
    charts = [
        c for c in _charts_db.values()
        if c.get("tenant_id") == tenant_id
    ]

    if roster_id:
        charts = [c for c in charts if c.get("roster_id") == roster_id]

    return [SeatingChartResponse(**c) for c in charts]


@router.post("", response_model=SeatingChartResponse, status_code=201)
async def create_seating_chart(
    chart: SeatingChartCreate,
    tenant_id: CurrentTenantId,
    user_id: CurrentUserId,
) -> SeatingChartResponse:
    """Create a new seating chart."""
    import uuid
    from datetime import datetime, timezone

    chart_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    chart_record = {
        "id": chart_id,
        "tenant_id": tenant_id,
        "created_by": user_id,
        "name": chart.name,
        "roster_id": chart.roster_id,
        "layout": chart.layout.model_dump(),
        "encrypted_positions": chart.encrypted_positions,
        "encryption_iv": chart.encryption_iv,
        "created_at": now,
        "updated_at": now,
    }

    _charts_db[chart_id] = chart_record

    return SeatingChartResponse(
        **{**chart_record, "layout": LayoutConfig(**chart_record["layout"])}
    )


@router.get("/{chart_id}", response_model=SeatingChartResponse)
async def get_seating_chart(
    chart_id: str,
    tenant_id: CurrentTenantId,
) -> SeatingChartResponse:
    """Get a specific seating chart."""
    from fastapi import HTTPException, status

    chart = _charts_db.get(chart_id)
    if not chart or chart.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seating chart not found",
        )

    return SeatingChartResponse(
        **{**chart, "layout": LayoutConfig(**chart["layout"])}
    )


@router.put("/{chart_id}", response_model=SeatingChartResponse)
async def update_seating_chart(
    chart_id: str,
    update: SeatingChartUpdate,
    tenant_id: CurrentTenantId,
) -> SeatingChartResponse:
    """Update a seating chart."""
    from datetime import datetime, timezone
    from fastapi import HTTPException, status

    chart = _charts_db.get(chart_id)
    if not chart or chart.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seating chart not found",
        )

    if update.name is not None:
        chart["name"] = update.name
    if update.layout is not None:
        chart["layout"] = update.layout.model_dump()
    if update.encrypted_positions is not None:
        chart["encrypted_positions"] = update.encrypted_positions
    if update.encryption_iv is not None:
        chart["encryption_iv"] = update.encryption_iv

    chart["updated_at"] = datetime.now(timezone.utc).isoformat()

    return SeatingChartResponse(
        **{**chart, "layout": LayoutConfig(**chart["layout"])}
    )


@router.delete("/{chart_id}", status_code=204)
async def delete_seating_chart(
    chart_id: str,
    tenant_id: CurrentTenantId,
) -> None:
    """Delete a seating chart."""
    from fastapi import HTTPException, status

    chart = _charts_db.get(chart_id)
    if not chart or chart.get("tenant_id") != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seating chart not found",
        )

    del _charts_db[chart_id]
