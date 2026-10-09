"""First-start demo history, evaluated by the same engine as live purchases."""

from datetime import datetime, timedelta, timezone
from typing import Sequence
from uuid import NAMESPACE_URL, uuid5

from .db import Database
from .persistence_models import EvaluatePurchase, PurchaseInput, Transaction, utc_time
from .transaction_service import evaluate_transaction


def build_seed_history(
    evaluate: EvaluatePurchase,
    purchases: Sequence[PurchaseInput],
    *,
    now: datetime | None = None,
) -> list[Transaction]:
    """Cycle shared-data purchases over 30 days, including some correct choices.

    Integration supplies actual merchant/card IDs. A four-purchase cycle with
    three debit purchases and one winner keeps most history on weaker cards.
    There are no duplicated card rates or mock merchants in the persistence layer.
    """
    if not purchases:
        raise ValueError("Supply at least one seed purchase from the shared mock wallet")
    end = utc_time(now or datetime.now(timezone.utc))
    return [
        evaluate_transaction(
            purchases[index % len(purchases)],
            evaluate,
            transaction_id=str(uuid5(NAMESPACE_URL, f"credit-optimizer/demo-seed-v1/{index}")),
            ts=end - timedelta(days=index, hours=2),
        )
        for index in range(30)
    ]


def seed_demo_history(
    database: Database,
    evaluate: EvaluatePurchase,
    purchases: Sequence[PurchaseInput],
    *,
    now: datetime | None = None,
) -> bool:
    return database.seed_if_empty(build_seed_history(evaluate, purchases, now=now))
