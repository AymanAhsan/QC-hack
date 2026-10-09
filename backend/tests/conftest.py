from datetime import datetime, timezone

import pytest

import db
from data import get_merchant
from schemas import TransactionCreate
from transaction_service import build_transaction

NOW = datetime(2026, 10, 9, 16, 0, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def database(tmp_path):
    """Every test gets its own empty, file-backed SQLite database (never backend/demo.sqlite3)."""
    database = db.Database.open(None, tmp_path / "history.sqlite3")
    db.use(database)
    yield database
    db.use(None)


@pytest.fixture
def make_transaction():
    counter = iter(range(10_000))

    def make(merchant_id="trader-joes", subtotal_cents=4250, card="everyday-debit", ts=NOW, coupon=None, key=None):
        merchant = get_merchant(merchant_id)
        body = TransactionCreate(
            idempotency_key=key or f"test-key-{next(counter):04d}",
            merchant_id=merchant_id,
            subtotal_cents=subtotal_cents,
            coupon_code=coupon,
            card_used_id=card,
            channel="store",
        )
        return build_transaction(body, merchant, merchant.coupons, ts=ts)

    return make
