"""GET /api/wallet and GET /api/locations. Owner: Omar."""

from fastapi import APIRouter

from data import DEFAULT_DEBIT_ID, IN_STORE_LOCATION_IDS, WALLET, get_merchant, location_distance_m
from schemas import LocationOut, LocationsResponse, WalletResponse
from serializers import card_out, merchant_out

router = APIRouter(prefix="/api", tags=["wallet"])


@router.get("/wallet", response_model=WalletResponse)
def get_wallet() -> WalletResponse:
    return WalletResponse(cards=[card_out(c) for c in WALLET], default_debit_card_id=DEFAULT_DEBIT_ID)


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
