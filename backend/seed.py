"""First-start demo history, computed by the same engine as live purchases.

Owner: Ayman (adapted during integration). 30 purchases spread over the trailing
30 days, mostly on the debit card so the Missed counter has a story to tell.
Seeding runs once per database (tracked in persistence_metadata).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import NAMESPACE_URL, uuid5

from data import get_merchant
from db import Database
from persistence_models import Transaction, utc_time
from schemas import TransactionCreate
from transaction_service import build_transaction

# (merchant_id, subtotal_cents, card_used_id, coupon_code)
SEED_PURCHASES: tuple[tuple[str, int, str, str | None], ...] = (
    ("trader-joes", 4250, "everyday-debit", None),
    ("chipotle", 1485, "everyday-debit", None),
    ("costco", 18740, "everyday-debit", None),
    ("starbucks", 785, "amex-gold", None),
    ("whole-foods", 6830, "everyday-debit", "FRESH10"),
    ("shell", 5200, "everyday-debit", None),
    ("nike", 10000, "everyday-debit", "SAVE15"),
    ("ubereats", 3200, "chase-sapphire", "EATS25"),
    ("target", 6415, "everyday-debit", None),
    ("sweetgreen", 1650, "everyday-debit", None),
    ("delta", 38900, "venture-x", "FLY50"),
    ("cvs", 2399, "everyday-debit", None),
    ("trader-joes", 5120, "chase-freedom", None),
    ("doordash", 2800, "everyday-debit", "DASH5"),
    ("costco", 21300, "chase-freedom", None),
    ("marriott", 24900, "everyday-debit", "STAY15"),
    ("chipotle", 1290, "amex-gold", None),
    ("uniqlo", 7900, "everyday-debit", "UNIQ10"),
    ("starbucks", 650, "everyday-debit", None),
    ("whole-foods", 4410, "apple-card", "FRESH10"),
    ("shell", 4800, "venture-x", None),
    ("hm", 6000, "everyday-debit", "HM20"),
    ("trader-joes", 3875, "everyday-debit", None),
    ("lululemon", 12800, "apple-card", "LULU20"),
    ("cvs", 1840, "everyday-debit", None),
    ("sweetgreen", 1725, "chase-sapphire", None),
    ("airbnb", 31200, "everyday-debit", "AWAY40"),
    ("target", 8930, "venture-x", None),
    ("ubereats", 2650, "everyday-debit", "EATS25"),
    ("chipotle", 1560, "everyday-debit", None),
)


def build_seed_history(*, now: datetime | None = None) -> list[Transaction]:
    end = utc_time(now or datetime.now(timezone.utc))
    history = []
    for index, (merchant_id, subtotal, card_id, coupon) in enumerate(SEED_PURCHASES):
        merchant = get_merchant(merchant_id)
        assert merchant is not None, merchant_id
        body = TransactionCreate(
            idempotency_key=f"demo-seed-v2-{index:02d}",
            merchant_id=merchant_id,
            subtotal_cents=subtotal,
            coupon_code=coupon,
            card_used_id=card_id,
            channel="store" if "store" in merchant.channels else "online",
            source="seed",
        )
        history.append(
            build_transaction(
                body,
                merchant,
                merchant.coupons,
                ts=end - timedelta(days=index, hours=1 + (index * 5) % 11),
                transaction_id=str(uuid5(NAMESPACE_URL, f"credit-optimizer/demo-seed-v2/{index}")),
            )
        )
    return history


def seed_demo_history(database: Database, *, now: datetime | None = None) -> bool:
    return database.seed_if_empty(build_seed_history(now=now))
