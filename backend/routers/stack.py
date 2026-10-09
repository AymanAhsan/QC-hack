"""POST /api/stack: Triple Stack for a known merchant id or a typed store name. Owner: Omar."""

from fastapi import Depends, APIRouter

from data import Card
from engine import triple_stack
from schemas import StackRequest, StackResponse
from serializers import stack_out
from services import resolve_merchant

from wallet_service import current_cards

router = APIRouter(prefix="/api", tags=["stack"])


@router.post("/stack", response_model=StackResponse)
async def stack(body: StackRequest, cards: tuple[Card, ...] = Depends(current_cards)) -> StackResponse:
    merchant, coupons = await resolve_merchant(body.merchant_id, body.merchant_name)
    result = triple_stack(cards, merchant, body.subtotal_cents, body.shipping_cents, coupons)
    return stack_out(result, coupons)
