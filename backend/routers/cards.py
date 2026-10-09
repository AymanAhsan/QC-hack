"""Per-user CRUD for simulated cards. Only type and last4 are stored inputs."""

from uuid import uuid4

from fastapi import APIRouter, Depends, Response

from db import Database, get_db
from errors import ApiError
from schemas import CardCreate, CardOut, CardUpdate, WalletResponse
from serializers import card_out
from wallet_service import UserId, wallet_response

router = APIRouter(prefix="/api/users/{user_id}/cards", tags=["cards"])


def require_card(card):
    if card is None:
        raise ApiError(404, "card_not_found", "Card not found in this user's wallet.")
    return card_out(card)


@router.get("", response_model=WalletResponse)
def list_cards(user_id: UserId, database: Database = Depends(get_db)):
    return wallet_response(database.list_cards(user_id))


@router.post("", response_model=CardOut, status_code=201)
def create_card(user_id: UserId, body: CardCreate, database: Database = Depends(get_db)):
    return card_out(database.create_card(user_id, str(uuid4()), body.type, body.last4))


@router.get("/{card_id}", response_model=CardOut)
def get_card(user_id: UserId, card_id: str, database: Database = Depends(get_db)):
    return require_card(database.get_card(user_id, card_id))


@router.patch("/{card_id}", response_model=CardOut)
def update_card(user_id: UserId, card_id: str, body: CardUpdate, database: Database = Depends(get_db)):
    return require_card(database.update_card(user_id, card_id, body.type, body.last4))


@router.delete("/{card_id}", status_code=204)
def delete_card(user_id: UserId, card_id: str, database: Database = Depends(get_db)):
    if not database.delete_card(user_id, card_id):
        raise ApiError(404, "card_not_found", "Card not found in this user's wallet.")
    return Response(status_code=204)
