"""GET /api/recommend: ranked cards and the "why" breakdown for one merchant. Owner: Omar."""

from fastapi import Depends, APIRouter, Query

from data import Card, get_merchant
from engine import rank_cards, winner_of
from errors import ApiError
from schemas import RecommendResponse
from serializers import evaluation_out, merchant_out, why_out

from wallet_service import current_cards

router = APIRouter(prefix="/api", tags=["recommend"])


@router.get("/recommend", response_model=RecommendResponse)
def recommend(
    cards: tuple[Card, ...] = Depends(current_cards),
    merchant_id: str = Query(description="Known merchant id, e.g. trader-joes."),
    amount_cents: int | None = Query(default=None, gt=0, le=10_000_000, description="Defaults to the merchant's typical spend."),
) -> RecommendResponse:
    merchant = get_merchant(merchant_id)
    if merchant is None:
        raise ApiError(404, "merchant_not_found", f"Unknown merchant id {merchant_id!r}.")
    amount = amount_cents if amount_cents is not None else merchant.typical_cents
    ranking = rank_cards(cards, merchant, amount)
    winner = winner_of(ranking)
    return RecommendResponse(
        merchant=merchant_out(merchant),
        amount_cents=amount,
        winner_card_id=winner.card.id if winner else None,
        no_accepted_card=winner is None,
        ranking=[evaluation_out(e) for e in ranking],
        why=why_out(ranking, merchant, amount),
    )
