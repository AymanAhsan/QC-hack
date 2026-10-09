"""Owned transaction router; include in Omar's FastAPI app at integration."""

from datetime import datetime
from decimal import Decimal
from typing import Callable, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..db import Database
from ..persistence_models import EvaluatePurchase, IdempotencyConflict, PurchaseInput
from ..transaction_service import evaluate_transaction, purchase_fingerprint


class TransactionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    merchant: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, le=Decimal("99999999.99"), decimal_places=2, allow_inf_nan=False)
    card_used: str = Field(min_length=1, max_length=120)
    channel: Literal["store", "online"] = "store"
    coupon_code: str | None = Field(default=None, min_length=1, max_length=80)
    request_id: UUID | None = None

    @field_validator("merchant", "card_used", "coupon_code")
    @classmethod
    def nonblank(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Must not be blank")
        return value


class TransactionResponse(BaseModel):
    id: UUID
    ts: datetime
    merchant: str
    category: str
    amount: float
    card_used: str
    best_card: str
    earned: float
    best_possible: float
    missed: float
    channel: Literal["store", "online"]


def create_transactions_router(
    database: Database,
    evaluate: EvaluatePurchase,
    *,
    clock: Callable[[], datetime] | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/api/transactions", tags=["transactions"])

    @router.post("", response_model=TransactionResponse, status_code=201)
    def create_transaction(body: TransactionRequest, response: Response):
        purchase = PurchaseInput(
            body.merchant, body.amount, body.card_used, body.channel, body.coupon_code
        )
        transaction_id = str(body.request_id or uuid4())
        try:
            existing = database.get(transaction_id)
            if existing:
                if existing.request_hash != purchase_fingerprint(purchase):
                    raise IdempotencyConflict("Request ID already belongs to another purchase")
                response.status_code = 200
                return existing.public()
            transaction = evaluate_transaction(
                purchase,
                evaluate,
                transaction_id=transaction_id,
                ts=clock() if clock else None,
            )
            return database.save(transaction).public()
        except IdempotencyConflict as error:
            raise HTTPException(status_code=409, detail=str(error)) from None
        except (ValueError, KeyError):
            raise HTTPException(
                status_code=422, detail="Invalid merchant, card, coupon, or purchase amount"
            ) from None

    @router.get("", response_model=list[TransactionResponse])
    def get_transactions(
        limit: int = Query(default=50, ge=1, le=100),
        offset: int = Query(default=0, ge=0, le=10000),
    ):
        return [transaction.public() for transaction in database.history(limit, offset)]

    return router
