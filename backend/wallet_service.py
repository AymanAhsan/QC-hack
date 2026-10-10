"""Demo user selection; replace with authenticated identity before production."""

from typing import Annotated

from fastapi import Depends, Header, Path

from data import Card
from db import Database, get_db
from schemas import WalletResponse
from serializers import card_out

USER_ID_PATTERN = r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$"
UserId = Annotated[str, Path(pattern=USER_ID_PATTERN)]


def current_user_id(user_id: Annotated[str, Header(alias="X-User-ID", pattern=USER_ID_PATTERN)] = "demo") -> str:
    return user_id


def current_cards(user_id: str = Depends(current_user_id), database: Database = Depends(get_db)) -> tuple[Card, ...]:
    return database.list_cards(user_id)


def wallet_response(cards: tuple[Card, ...]) -> WalletResponse:
    debit = next((card.id for card in cards if card.is_default_debit), None)
    return WalletResponse(cards=[card_out(card) for card in cards], default_debit_card_id=debit)
