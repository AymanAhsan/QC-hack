"""POST /api/transactions. Owner: Ayman.

Foundation stub: validates the request against the contract and answers 501
until persistence lands. The real handler must compute every reward value with
engine.evaluate_purchase (never trust client totals) and dedupe on
idempotency_key. Use services.resolve_merchant for merchant + coupon lookup.
"""

from fastapi import APIRouter

from errors import ApiError
from schemas import TransactionCreate, TransactionCreateResponse

router = APIRouter(prefix="/api", tags=["transactions"])


@router.post("/transactions", response_model=TransactionCreateResponse, status_code=201)
async def create_transaction(body: TransactionCreate) -> TransactionCreateResponse:
    raise ApiError(501, "not_implemented", "Transaction persistence is not available yet.")
