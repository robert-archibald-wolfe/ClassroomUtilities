"""API routes aggregation."""

from fastapi import APIRouter

from app.api.routes import ai, auth, rosters, seating, timers

router = APIRouter()

# Public routes
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(timers.router, prefix="/timers", tags=["Timers"])

# Protected routes (require authentication)
router.include_router(rosters.router, prefix="/rosters", tags=["Rosters"])
router.include_router(seating.router, prefix="/seating-charts", tags=["Seating Charts"])
router.include_router(ai.router, prefix="/ai", tags=["AI Generation"])
