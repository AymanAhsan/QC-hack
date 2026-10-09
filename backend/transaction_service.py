"""Turn a validated purchase request into an immutable, engine-computed record.

Owner: Ayman (adapted to the docs/API.md contract during integration).
Clients send inputs only; every reward value comes from engine.evaluate_purchase.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Sequence
from uuid import uuid4

from starlette.concurrency import run_in_threadpool

from data import WALLET, Coupon, Merchant
from db import Database
from engine import evaluate_purchase
from persistence_models import IdempotencyConflict, Transaction
from schemas import TransactionCreate
from services import resolve_merchant


def purchase_fingerprint(body: TransactionCreate) -> str:
    """Hash of everything except the idempotency key, so a reused key with a different purchase is caught."""
    payload = body.model_dump(exclude={"idempotency_key"})
    if payload.get("coupon_code"):
        payload["coupon_code"] = payload["coupon_code"].strip().upper()
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def build_transaction(
    body: TransactionCreate,
    merchant: Merchant,
    coupons: Sequence[Coupon],
    *,
    ts: datetime | None = None,
    transaction_id: str | None = None,
) -> Transaction:
    p = evaluate_purchase(WALLET, merchant, body.subtotal_cents, body.card_used_id, body.coupon_code, body.shipping_cents, coupons)
    return Transaction(
        id=transaction_id or str(uuid4()),
        ts=ts or datetime.now(timezone.utc),
        idempotency_key=body.idempotency_key,
        merchant_id=merchant.id,
        merchant_name=merchant.name,
        category=merchant.category,
        channel=body.channel,
        source=body.source,
        subtotal_cents=p.subtotal_cents,
        shipping_cents=p.shipping_cents,
        coupon_code=p.coupon.coupon.code if p.coupon else None,
        coupon_savings_cents=p.coupon.savings_cents if p.coupon else 0,
        amount_cents=p.charge_cents,
        card_used_id=p.used.card.id,
        best_card_id=p.best.card.id if p.best else None,
        earned_cents=p.earned_cents,
        best_possible_cents=p.best_possible_cents,
        missed_cents=p.missed_cents,
        points_earned=p.used.points,
        request_hash=purchase_fingerprint(body),
    )


async def record_purchase(database: Database, body: TransactionCreate, *, now: datetime | None = None) -> tuple[Transaction, bool]:
    """Persist one purchase. A retried idempotency key returns the stored record without re-evaluating it."""
    existing = await run_in_threadpool(database.get_by_key, body.idempotency_key)
    if existing is not None:
        if existing.request_hash != purchase_fingerprint(body):
            raise IdempotencyConflict("This idempotency key was already used for a different purchase.")
        return existing, True
    merchant, coupons = await resolve_merchant(body.merchant_id, body.merchant_name)
    transaction = build_transaction(body, merchant, coupons, ts=now)
    return await run_in_threadpool(database.save, transaction)
