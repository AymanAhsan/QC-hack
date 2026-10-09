from datetime import datetime, timezone
from decimal import Decimal

import pytest

from backend.db import Database
from backend.persistence_models import PurchaseEvaluation, PurchaseInput
from backend.transaction_service import evaluate_transaction

NOW = datetime(2026, 10, 9, 16, 0, tzinfo=timezone.utc)


@pytest.fixture
def database(tmp_path):
    return Database(tmp_path / "history.sqlite3")


@pytest.fixture
def evaluate():
    # Test-only adapter. Production must inject the real shared rewards engine.
    def evaluate_purchase(purchase):
        if purchase.merchant not in ("trader_joes", "nike", "costco"):
            raise KeyError("Unknown merchant")
        if purchase.card_used not in ("debit", "amex_gold", "apple", "freedom"):
            raise KeyError("Unknown card")
        category, best_card, yield_rate = {
            "trader_joes": ("grocery", "Amex Gold", Decimal("0.072")),
            "nike": ("retail", "Apple Card", Decimal("0.03")),
            "costco": ("wholesale", "Chase Freedom", Decimal("0.05")),
        }[purchase.merchant]
        names = {
            "debit": "Everyday Debit",
            "amex_gold": "Amex Gold",
            "apple": "Apple Card",
            "freedom": "Chase Freedom",
        }
        amount = purchase.amount
        if purchase.coupon_code:
            if purchase.merchant != "nike" or purchase.coupon_code != "SAVE15":
                raise ValueError("Invalid coupon")
            amount *= Decimal("0.85")
        earned = amount * yield_rate if names[purchase.card_used] == best_card else Decimal(0)
        return PurchaseEvaluation(
            purchase.merchant,
            category,
            names[purchase.card_used],
            best_card,
            amount,
            earned,
            amount * yield_rate,
        )

    return evaluate_purchase


@pytest.fixture
def make_transaction(evaluate):
    def make(*, merchant="trader_joes", amount="42.50", card="debit", ts=NOW, **kwargs):
        return evaluate_transaction(
            PurchaseInput(merchant, Decimal(amount), card), evaluate, ts=ts, **kwargs
        )

    return make
