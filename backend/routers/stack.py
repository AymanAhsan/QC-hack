"""POST /api/stack: Triple Stack for a known merchant id or a typed store name. Owner: Omar."""

from fastapi import APIRouter

from data import WALLET
from engine import triple_stack
from schemas import StackRequest, StackResponse
from serializers import stack_out
from services import resolve_merchant

router = APIRouter(prefix="/api", tags=["stack"])


@router.post("/stack", response_model=StackResponse)
async def stack(body: StackRequest) -> StackResponse:
    merchant, coupons = await resolve_merchant(body.merchant_id, body.merchant_name)
    result = triple_stack(WALLET, merchant, body.subtotal_cents, body.shipping_cents, coupons)
    return stack_out(result, coupons)
