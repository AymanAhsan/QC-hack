"""Turn a server-evaluated purchase into an immutable reward snapshot."""

from datetime import datetime, timezone
from decimal import Decimal
import hashlib
import json
from uuid import uuid4

from .persistence_models import EvaluatePurchase, PurchaseInput, Transaction, money


def purchase_fingerprint(purchase: PurchaseInput) -> str:
    payload = {
        "merchant": purchase.merchant,
        "amount": format(money(purchase.amount), ".2f"),
        "card_used": purchase.card_used,
        "channel": purchase.channel,
        "coupon_code": purchase.coupon_code,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def evaluate_transaction(
    purchase: PurchaseInput,
    evaluate: EvaluatePurchase,
    *,
    transaction_id: str | None = None,
    ts: datetime | None = None,
) -> Transaction:
    if money(purchase.amount) <= 0:
        raise ValueError("Purchase amount must be positive")
    evaluation = evaluate(purchase)
    amount = money(evaluation.amount)
    if amount > money(purchase.amount):
        raise ValueError("Evaluated amount cannot exceed submitted subtotal")
    earned = money(evaluation.earned)
    best_possible = money(evaluation.best_possible)
    return Transaction(
        id=transaction_id or str(uuid4()),
        ts=ts or datetime.now(timezone.utc),
        merchant=evaluation.merchant,
        category=evaluation.category,
        amount=amount,
        card_used=evaluation.card_used,
        best_card=evaluation.best_card,
        earned=earned,
        best_possible=best_possible,
        missed=max(best_possible - earned, Decimal(0)),
        channel=purchase.channel,
        request_hash=purchase_fingerprint(purchase),
    )
