"""GET /api/wallet and GET /api/locations. Owner: Omar."""

from fastapi import APIRouter, Depends

from data import Card, IN_STORE_LOCATION_IDS, get_merchant, location_distance_m
from wallet_service import current_cards, wallet_response
from schemas import LocationOut, LocationsResponse, WalletResponse
from serializers import merchant_out

router = APIRouter(prefix="/api", tags=["wallet"])


@router.get("/wallet", response_model=WalletResponse)
def get_wallet(cards: tuple[Card, ...] = Depends(current_cards)) -> WalletResponse:
    return wallet_response(cards)


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
