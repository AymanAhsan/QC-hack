"""Trailing-window totals and chart/history contract for the Missed screen."""

from datetime import date, datetime
from typing import Callable, Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..db import Database
from .transactions import TransactionResponse


class DailyMissed(BaseModel):
    date: date
    missed: float
    transaction_count: int


class CategoryMissed(BaseModel):
    category: str
    missed: float
    transaction_count: int


class MissedResponse(BaseModel):
    window_days: Literal[30]
    window_start: datetime
    window_end: datetime
    currency: Literal["USD"]
    total_missed: float
    total_earned: float
    best_possible: float
    transaction_count: int
    daily: list[DailyMissed]
    by_category: list[CategoryMissed]
    transactions: list[TransactionResponse]


def create_missed_router(
    database: Database,
    *,
    clock: Callable[[], datetime] | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/api/missed", tags=["missed"])

    @router.get("", response_model=MissedResponse)
    def get_missed(limit: int = Query(default=50, ge=1, le=100)):
        return database.missed(now=clock() if clock else None, limit=limit)

    return router
