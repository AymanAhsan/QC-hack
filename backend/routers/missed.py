"""GET /api/missed: trailing-window totals, daily chart, categories, recent history. Owner: Ayman."""

from fastapi import APIRouter, Depends, Query
from starlette.concurrency import run_in_threadpool

from db import Database, get_db
from errors import ApiError
from persistence_models import DatabaseUnavailable
from schemas import MissedResponse

router = APIRouter(prefix="/api", tags=["missed"])


@router.get("/missed", response_model=MissedResponse)
async def get_missed(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=50, ge=1, le=200),
    database: Database = Depends(get_db),
) -> MissedResponse:
    try:
        summary = await run_in_threadpool(lambda: database.missed(days=days, limit=limit))
    except DatabaseUnavailable as exc:
        raise ApiError(503, "database_unavailable", str(exc)) from None
    return MissedResponse(**summary)
