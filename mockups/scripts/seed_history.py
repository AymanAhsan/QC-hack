"""Writes mockups/src/data/missed.json: a month of purchases by someone who uses the app.

The backend's demo seed (backend/seed.py) puts most purchases on the debit card so the
Missed screen has a story. The mockups show a regular user instead: they pay with the
card the app picks almost every time and stack the best code when there is one, with a
few slips (debit at Starbucks, the wrong card for gas). Every purchase still runs
through the backend's own engine and database code, so the amounts, rewards, and the
response shape are exactly what GET /api/missed would return.

Run from the backend folder, with its virtualenv:
    cd backend && .venv/bin/python ../mockups/scripts/seed_history.py
"""

from __future__ import annotations

import json
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

sys.path.insert(0, str(Path.cwd()))

from data import WALLET, get_merchant  # noqa: E402
from db import Database  # noqa: E402
from engine import best_coupon, rank_cards, winner_of  # noqa: E402
from schemas import MissedResponse, TransactionCreate  # noqa: E402
from transaction_service import build_transaction  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "src" / "data" / "missed.json"
# 2pm ET on the demo day; every purchase is before it.
NOW = datetime(2026, 10, 10, 18, 0, tzinfo=timezone.utc)

# (days ago, hour in ET, merchant, subtotal cents, slip) — slip is the card used by mistake,
# None means the user paid with the card the app picked. Newest first; the last 9 are all
# best-card, so the next best-card payment in the demo is a 10-purchase streak.
PURCHASES: tuple[tuple[int, int, str, int, str | None], ...] = (
    (0, 9, "starbucks", 745, None),
    (1, 19, "doordash", 3480, None),
    (1, 12, "sweetgreen", 1695, None),
    (2, 18, "trader-joes", 6215, None),
    (2, 8, "starbucks", 690, None),
    (3, 13, "cvs", 2799, None),
    (4, 20, "ubereats", 4120, None),
    (4, 12, "chipotle", 1535, None),
    (5, 17, "shell", 5240, None),
    (6, 16, "starbucks", 820, "everyday-debit"),
    (6, 11, "target", 11840, None),
    (7, 19, "whole-foods", 8930, None),
    (8, 13, "sweetgreen", 1725, None),
    (8, 9, "starbucks", 615, None),
    (9, 18, "costco", 21370, None),
    (10, 20, "airbnb", 31200, None),
    (10, 12, "chipotle", 1395, None),
    (11, 17, "trader-joes", 4380, None),
    (12, 14, "lululemon", 12800, None),
    (13, 19, "ubereats", 2890, None),
    (13, 8, "starbucks", 745, None),
    (14, 16, "shell", 4810, "apple-card"),
    (15, 12, "sweetgreen", 1650, None),
    (16, 18, "whole-foods", 5470, "chase-sapphire"),
    (17, 10, "delta", 38900, None),
    (18, 13, "chipotle", 1490, None),
    (18, 20, "doordash", 2650, None),
    (19, 17, "target", 6415, None),
    (20, 9, "starbucks", 690, None),
    (20, 18, "trader-joes", 5120, "everyday-debit"),
    (21, 15, "uniqlo", 8900, None),
    (22, 12, "cvs", 1840, None),
    (23, 19, "ubereats", 3650, None),
    (24, 18, "costco", 18740, "venture-x"),
    (25, 14, "hm", 6400, None),
    (25, 9, "starbucks", 785, None),
    (26, 17, "shell", 5500, None),
    (27, 13, "nike", 10000, None),
    (28, 18, "whole-foods", 4410, None),
    (28, 21, "marriott", 24900, None),
    (29, 12, "sweetgreen", 1725, "everyday-debit"),
    (29, 17, "trader-joes", 3875, None),
)


def main() -> None:
    history = []
    for index, (days_ago, hour_et, merchant_id, subtotal, slip) in enumerate(PURCHASES):
        merchant = get_merchant(merchant_id)
        assert merchant is not None, merchant_id
        coupon, _ = best_coupon(merchant.coupons, subtotal, None)
        charge = subtotal - (coupon.savings_cents if coupon else 0)
        best = winner_of(rank_cards(WALLET, merchant, charge))
        assert best is not None, merchant_id
        body = TransactionCreate(
            idempotency_key=f"mockup-history-{index:02d}",
            merchant_id=merchant_id,
            subtotal_cents=subtotal,
            coupon_code=coupon.coupon.code if coupon else None,
            card_used_id=slip or best.card.id,
            channel="store" if "store" in merchant.channels else "online",
            source="seed",
        )
        # Midnight ET (UTC-4 in October) on that day, plus the hour.
        midnight_et = (NOW - timedelta(days=days_ago)).replace(hour=4, minute=0)
        ts = midnight_et + timedelta(hours=hour_et, minutes=(index * 17) % 60)
        assert ts < NOW, (merchant_id, ts)
        history.append(
            build_transaction(
                body,
                merchant,
                merchant.coupons,
                ts=ts,
                transaction_id=str(uuid5(NAMESPACE_URL, f"credit-optimizer/mockup-history/{index}")),
            )
        )

    with tempfile.TemporaryDirectory() as tmp:
        database = Database.open(None, Path(tmp) / "mockup.sqlite3")
        assert database.seed_if_empty(history)
        summary = MissedResponse(**database.missed(now=NOW, days=30, limit=200)).model_dump(mode="json")

    OUT.write_text(json.dumps(summary, separators=(",", ":")) + "\n")
    earned, best, missed = summary["total_earned_cents"], summary["total_best_possible_cents"], summary["total_missed_cents"]
    spent = sum(t["amount_cents"] for t in summary["recent"])
    coupons = sum(t["coupon_savings_cents"] for t in summary["recent"])
    print(f"{summary['transaction_count']} purchases, ${spent / 100:,.2f} spent")
    print(f"earned ${earned / 100:,.2f} of ${best / 100:,.2f} possible ({earned / best:.0%}), missed ${missed / 100:,.2f}")
    print(f"codes saved ${coupons / 100:,.2f} on {sum(1 for t in summary['recent'] if t['coupon_code'])} orders")


if __name__ == "__main__":
    main()
