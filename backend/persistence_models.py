"""Persistence contracts; reward evaluation belongs to Omar's engine."""

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal, Protocol

CENT = Decimal("0.01")
MAX_MONEY = Decimal("99999999.99")
Channel = Literal["store", "online"]


def money(value: Decimal | str | int) -> Decimal:
    result = Decimal(str(value))
    if not result.is_finite() or result < 0 or result > MAX_MONEY:
        raise ValueError("Money must be finite and between 0 and 99999999.99")
    return result.quantize(CENT, rounding=ROUND_HALF_UP)


def utc_time(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("Timestamps must include a timezone")
    return value.astimezone(timezone.utc)


@dataclass(frozen=True)
class PurchaseInput:
    merchant: str
    amount: Decimal  # Submitted subtotal; engine applies coupon, if provided.
    card_used: str
    channel: Channel = "store"
    coupon_code: str | None = None


@dataclass(frozen=True)
class PurchaseEvaluation:
    merchant: str  # Display name, resolved by the shared engine adapter.
    category: str
    card_used: str  # Display name, resolved by the shared engine adapter.
    best_card: str
    amount: Decimal  # Amount after coupon; this is the rewards basis.
    earned: Decimal
    best_possible: Decimal


class EvaluatePurchase(Protocol):
    def __call__(self, purchase: PurchaseInput) -> PurchaseEvaluation: ...


@dataclass(frozen=True)
class Transaction:
    id: str
    ts: datetime
    merchant: str
    category: str
    amount: Decimal
    card_used: str
    best_card: str
    earned: Decimal
    best_possible: Decimal
    missed: Decimal
    channel: Channel
    request_hash: str  # Internal idempotency fingerprint; never returned to UI.

    def __post_init__(self) -> None:
        object.__setattr__(self, "ts", utc_time(self.ts))
        for field in ("amount", "earned", "best_possible", "missed"):
            object.__setattr__(self, field, money(getattr(self, field)))
        if self.missed != max(self.best_possible - self.earned, Decimal(0)):
            raise ValueError("Missed must equal max(best_possible - earned, 0)")
        if self.channel not in ("store", "online"):
            raise ValueError("Unsupported purchase channel")
        if not all(
            (
                self.id,
                self.merchant,
                self.category,
                self.card_used,
                self.best_card,
                self.request_hash,
            )
        ):
            raise ValueError("Transaction identifiers and labels must not be empty")

    def public(self) -> dict:
        return {
            "id": self.id,
            "ts": self.ts.isoformat().replace("+00:00", "Z"),
            "merchant": self.merchant,
            "category": self.category,
            "amount": float(self.amount),
            "card_used": self.card_used,
            "best_card": self.best_card,
            "earned": float(self.earned),
            "best_possible": float(self.best_possible),
            "missed": float(self.missed),
            "channel": self.channel,
        }


class IdempotencyConflict(ValueError):
    """The same request ID was reused for a different purchase."""
