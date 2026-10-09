"""POST /api/transactions: log one simulated purchase. Owner: Ayman.

The server computes every reward value (engine.evaluate_purchase); the request
schema rejects client-supplied totals. A repeated idempotency_key returns the
stored transaction with duplicate=true and writes nothing.
"""

from fastapi import APIRouter, Depends, Response

from db import Database, get_db
from errors import ApiError
from persistence_models import DatabaseUnavailable, IdempotencyConflict
from schemas import TransactionCreate, TransactionCreateResponse, TransactionOut
from transaction_service import record_purchase

router = APIRouter(prefix="/api", tags=["transactions"])


@router.post("/transactions", response_model=TransactionCreateResponse, status_code=201)
async def create_transaction(
    body: TransactionCreate, response: Response, database: Database = Depends(get_db)
) -> TransactionCreateResponse:
    try:
        transaction, duplicate = await record_purchase(database, body)
    except IdempotencyConflict as exc:
        raise ApiError(409, "idempotency_conflict", str(exc)) from None
    except DatabaseUnavailable as exc:
        raise ApiError(503, "database_unavailable", str(exc)) from None
    if duplicate:
        response.status_code = 200
    return TransactionCreateResponse(transaction=TransactionOut(**transaction.public()), duplicate=duplicate)
