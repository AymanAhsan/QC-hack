"""GET /api/missed. Owner: Ayman.

Foundation stub: answers 501 until persistence lands. See docs/API.md for the
response shape (trailing 30-day window, daily buckets, recent list, db_mode).
"""

from fastapi import APIRouter, Query

from errors import ApiError
from schemas import MissedResponse

router = APIRouter(prefix="/api", tags=["missed"])


@router.get("/missed", response_model=MissedResponse)
def get_missed(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=50, ge=1, le=200),
) -> MissedResponse:
    raise ApiError(501, "not_implemented", "Missed-rewards history is not available yet.")
