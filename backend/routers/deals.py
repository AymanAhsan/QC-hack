"""GET /api/deals: today's best stacks grouped into Meals, Clothing, Travel. Owner: Omar."""

from typing import Literal

from fastapi import APIRouter, Query

from data import DEAL_FEEDS, MERCHANTS, WALLET
from engine import round_pct, triple_stack
from schemas import DealCategoryOut, DealOut, DealsResponse
from serializers import coupon_check_out, merchant_out

router = APIRouter(prefix="/api", tags=["deals"])


def _headline(name: str, coupon_code: str | None, card_name: str | None, pct: float) -> str:
    parts = [p for p in (coupon_code, card_name) if p]
    return f"{' + '.join(parts) or name} = {pct:g}% back"


@router.get("/deals", response_model=DealsResponse)
def deals(category: Literal["meals", "clothing", "travel"] | None = Query(default=None)) -> DealsResponse:
    categories = []
    for feed_id, meta in DEAL_FEEDS.items():
        if category and feed_id != category:
            continue
        feed = []
        for merchant in (m for m in MERCHANTS if m.deal_feed == feed_id):
            stack = triple_stack(WALLET, merchant, merchant.typical_cents)
            winner = stack.winner
            pct = float(stack.total_value_pct)
            coupon_code = stack.coupon.coupon.code if stack.coupon else None
            feed.append(
                DealOut(
                    merchant=merchant_out(merchant),
                    example_subtotal_cents=stack.subtotal_cents,
                    coupon=coupon_check_out(stack.coupon) if stack.coupon else None,
                    winner_card_id=winner.card.id if winner else None,
                    winner_card_name=winner.card.name if winner else None,
                    card_yield_pct=float(round_pct(winner.yield_pct)) if winner else 0.0,
                    rewards_value_cents=stack.rewards_value_cents,
                    total_value_cents=stack.total_value_cents,
                    total_value_pct=pct,
                    headline=_headline(merchant.name, coupon_code, winner.card.name if winner else None, pct),
                )
            )
        feed.sort(key=lambda d: -d.total_value_pct)
        categories.append(DealCategoryOut(id=feed_id, label=meta["label"], emoji=meta["emoji"], deals=feed))
    return DealsResponse(categories=categories)
