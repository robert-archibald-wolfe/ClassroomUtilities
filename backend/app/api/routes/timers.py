"""Timer routes.

Timers are stateless utilities - no authentication required for basic use.
Presets can be saved by authenticated users.
"""

from pydantic import BaseModel
from fastapi import APIRouter
from typing import Annotated

from fastapi import Depends

router = APIRouter()


# --- Schemas ---


class TimerPreset(BaseModel):
    """Timer preset configuration."""
    name: str
    duration_seconds: int
    theme: str = "minimal"  # "minimal", "colorful", "progress"
    sound: str | None = None  # "bell", "chime", "none"
    auto_start: bool = False


class TimerPresetResponse(BaseModel):
    """Timer preset response."""
    id: str
    name: str
    duration_seconds: int
    theme: str
    sound: str | None
    auto_start: bool


# --- Temporary in-memory store ---

_presets_db: dict[str, dict] = {}

# Default presets available to everyone
DEFAULT_PRESETS = [
    {
        "id": "default-5min",
        "name": "5 Minutes",
        "duration_seconds": 300,
        "theme": "minimal",
        "sound": "bell",
        "auto_start": False,
    },
    {
        "id": "default-10min",
        "name": "10 Minutes",
        "duration_seconds": 600,
        "theme": "minimal",
        "sound": "bell",
        "auto_start": False,
    },
    {
        "id": "default-15min",
        "name": "15 Minutes",
        "duration_seconds": 900,
        "theme": "minimal",
        "sound": "bell",
        "auto_start": False,
    },
    {
        "id": "default-pomodoro",
        "name": "Pomodoro (25 min)",
        "duration_seconds": 1500,
        "theme": "colorful",
        "sound": "chime",
        "auto_start": False,
    },
]


# --- Public Routes (No Auth) ---


@router.get("/presets/default", response_model=list[TimerPresetResponse])
async def get_default_presets() -> list[TimerPresetResponse]:
    """Get default timer presets (no auth required)."""
    return [TimerPresetResponse(**p) for p in DEFAULT_PRESETS]


@router.get("/embed")
async def get_embed_config(
    duration: int = 300,
    theme: str = "minimal",
    sound: str | None = "bell",
    auto_start: bool = False,
) -> dict:
    """
    Get configuration for an embeddable timer.

    Use this endpoint to generate embed URLs:
    /timer/embed?duration=300&theme=minimal&sound=bell

    Returns configuration that the frontend timer widget uses.
    """
    return {
        "duration_seconds": duration,
        "theme": theme,
        "sound": sound,
        "auto_start": auto_start,
        "embed_url": f"/timer?d={duration}&t={theme}&s={sound or 'none'}&a={'1' if auto_start else '0'}",
    }


# --- Protected Routes (Auth Required) ---
# Uncomment when ready to implement user presets

# from app.api.deps import CurrentTenantId, CurrentUserId

# @router.get("/presets", response_model=list[TimerPresetResponse])
# async def list_user_presets(
#     tenant_id: CurrentTenantId,
# ) -> list[TimerPresetResponse]:
#     """List user's saved timer presets."""
#     presets = [
#         p for p in _presets_db.values()
#         if p.get("tenant_id") == tenant_id
#     ]
#     return [TimerPresetResponse(**p) for p in presets]

# @router.post("/presets", response_model=TimerPresetResponse, status_code=201)
# async def create_preset(
#     preset: TimerPreset,
#     tenant_id: CurrentTenantId,
#     user_id: CurrentUserId,
# ) -> TimerPresetResponse:
#     """Save a custom timer preset."""
#     import uuid
#
#     preset_id = str(uuid.uuid4())
#     preset_record = {
#         "id": preset_id,
#         "tenant_id": tenant_id,
#         "created_by": user_id,
#         **preset.model_dump(),
#     }
#     _presets_db[preset_id] = preset_record
#     return TimerPresetResponse(**preset_record)
