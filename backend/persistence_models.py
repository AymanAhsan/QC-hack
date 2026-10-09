"""Persistence records. Reward values come from engine.py; nothing is recalculated here.

Owner: Ayman (adapted to the docs/API.md contract during integration).
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone

Channel = ("store", "online")


class IdempotencyConflict(ValueError):
    """The same idempotency key was reused for a different purchase."""


class DatabaseUnavailable(RuntimeError):
    """The configured database could not complete the operation. Nothing was persisted."""


def utc_time(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("Timestamps must include a timezone")
    return value.astimezone(timezone.utc)


@dataclass(frozen=True)
class Transaction:
    id: str
    ts: datetime
    idempotency_key: str
    merchant_id: str
    merchant_name: str
    category: str
    channel: str
    source: str
    subtotal_cents: int
    shipping_cents: int | None
    coupon_code: str | None
    coupon_savings_cents: int
    amount_cents: int
    card_used_id: str
    best_card_id: str | None
    earned_cents: int
    best_possible_cents: int
    missed_cents: int
    points_earned: int | None
    request_hash: str  # Fingerprint of the request body; never returned to the UI.

    def __post_init__(self) -> None:
        object.__setattr__(self, "ts", utc_time(self.ts))
        for name in ("subtotal_cents", "coupon_savings_cents", "amount_cents", "earned_cents", "best_possible_cents", "missed_cents"):
            if getattr(self, name) < 0:
                raise ValueError(f"{name} must not be negative")
        if self.missed_cents != max(self.best_possible_cents - self.earned_cents, 0):
            raise ValueError("missed_cents must equal max(best_possible_cents - earned_cents, 0)")
        if self.channel not in Channel:
            raise ValueError("Unsupported purchase channel")
        if not all((self.id, self.idempotency_key, self.merchant_id, self.merchant_name, self.card_used_id, self.request_hash)):
            raise ValueError("Transaction identifiers must not be empty")

    def public(self) -> dict:
        """The TransactionOut shape from schemas.py."""
        data = asdict(self)
        data.pop("request_hash")
        data.pop("idempotency_key")
        data["ts"] = self.ts.isoformat(timespec="seconds").replace("+00:00", "Z")
        return data


COLUMNS = tuple(Transaction.__dataclass_fields__)
