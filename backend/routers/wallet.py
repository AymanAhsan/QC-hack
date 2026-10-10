"""GET /api/wallet, GET /api/wallet/{card_id}/benefits, GET /api/locations, POST /api/locations/detect. Owner: Omar."""

from fastapi import APIRouter, Depends

from data import MERCHANTS, Card, IN_STORE_LOCATION_IDS, LOCATION_COORDS, get_merchant, location_distance_m
from engine import card_benefits
from errors import ApiError
from location_detect import detect_store
from wallet_service import current_cards, wallet_response
from schemas import BenefitRow, BenefitStore, CardBenefitsResponse, DetectLocationRequest, DetectLocationResponse, LocationOut, LocationsResponse, WalletResponse
from serializers import card_out, merchant_out

router = APIRouter(prefix="/api", tags=["wallet"])


@router.get("/wallet", response_model=WalletResponse)
def get_wallet(cards: tuple[Card, ...] = Depends(current_cards)) -> WalletResponse:
    return wallet_response(cards)


@router.get("/wallet/{card_id}/benefits", response_model=CardBenefitsResponse)
def get_card_benefits(card_id: str, cards: tuple[Card, ...] = Depends(current_cards)) -> CardBenefitsResponse:
    card = next((c for c in cards if c.id == card_id), None)
    if card is None:
        raise ApiError(404, "card_not_found", f"Card {card_id!r} is not in this wallet.")
    b = card_benefits(card, cards, MERCHANTS)
    return CardBenefitsResponse(
        card=card_out(card),
        valuation_label=b["valuation_label"],
        benefits=[BenefitRow(**{**r, "multiplier": float(r["multiplier"]), "yield_pct": float(r["yield_pct"])}) for r in b["benefits"]],
        best_at=[
            BenefitStore(merchant_id=m.id, merchant_name=m.name, emoji=m.emoji, yield_pct=float(y), accepts=list(m.accepts))
            for m, y in b["best_at"]
        ],
        not_accepted_at=[
            BenefitStore(merchant_id=m.id, merchant_name=m.name, emoji=m.emoji, yield_pct=None, accepts=list(m.accepts))
            for m in b["not_accepted_at"]
        ],
    )


@router.get("/locations", response_model=LocationsResponse)
def get_locations() -> LocationsResponse:
    locations = []
    for merchant_id in IN_STORE_LOCATION_IDS:
        merchant = get_merchant(merchant_id)
        assert merchant is not None and merchant.address
        locations.append(
            LocationOut(
                id=merchant.id,
                merchant=merchant_out(merchant),
                address=merchant.address,
                distance_m=location_distance_m(merchant.id),
            )
        )
    locations.sort(key=lambda loc: loc.distance_m)
    return LocationsResponse(locations=locations)


@router.post("/locations/detect", response_model=DetectLocationResponse)
def detect_location(body: DetectLocationRequest) -> DetectLocationResponse:
    """Which demo store is this GPS fix in? POST so coordinates stay out of URLs and access logs.

    The fix is used for the match and then dropped: nothing is stored or logged.
    """
    result = detect_store(body.lat, body.lng, body.accuracy_m, LOCATION_COORDS)
    if result.merchant_id is None:
        return DetectLocationResponse(status=result.status, location=None)
    merchant = get_merchant(result.merchant_id)
    assert merchant is not None and merchant.address and result.distance_m is not None
    return DetectLocationResponse(
        status=result.status,
        location=LocationOut(
            id=merchant.id,
            merchant=merchant_out(merchant),
            address=merchant.address,
            distance_m=result.distance_m,
        ),
    )
