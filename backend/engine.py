"""Rewards engine: card ranking, Triple Stack, and missed rewards.

Pure functions only: no network, database, or clock access.

Money and rounding rules (see docs/API.md, "Units and rounding"):
- Inputs and outputs are integer cents.
- Intermediate maths uses Decimal.
- Reward value: amount x yield% / 100, rounded to the nearest cent, half up.
- Points: amount in dollars x multiplier, rounded to the nearest point, half up.
- Percentages are percent units (7.2 means 7.2%), rounded to 2 decimals, half up.
- Missed rewards use the already-rounded cent values of both cards, so the
  numbers shown for each card always subtract to the missed amount.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable, Sequence

from data import CATEGORY_LABELS, NETWORK_LABELS, Card, Coupon, Merchant

ZERO = Decimal("0")
HUNDRED = Decimal("100")


class EngineError(ValueError):
    """Invalid input to the engine. `code` maps onto the API error envelope."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def round_whole(value: Decimal) -> int:
    """Round half up to a whole number (cents or points)."""
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


round_cents = round_whole


def round_pct(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _fmt_num(value: Decimal) -> str:
    """Decimal to a short string: 4 -> "4", 1.80 -> "1.8"."""
    return format(value.normalize(), "f")


# --------------------------------------------------------------------------- cards


@dataclass(frozen=True)
class RateLookup:
    multiplier: Decimal
    source: str  # "merchant" | "category" | "base"


def lookup_rate(card: Card, merchant: Merchant) -> RateLookup:
    """Merchant-specific rate first, then category rate, then base rate."""
    if merchant.id in card.merchant_rates:
        return RateLookup(card.merchant_rates[merchant.id], "merchant")
    if merchant.category in card.category_rates:
        return RateLookup(card.category_rates[merchant.category], "category")
    return RateLookup(card.base_rate, "base")


def rate_label(card: Card, merchant: Merchant, rate: RateLookup) -> str:
    unit = "x points" if card.reward_type == "points" else "% cash back"
    amount = f"{_fmt_num(rate.multiplier)}{unit}"
    if rate.source == "merchant":
        return f"{amount} at {merchant.name}"
    if rate.source == "category":
        return f"{amount} on {CATEGORY_LABELS.get(merchant.category, merchant.category)}"
    return f"{amount} base rate"


@dataclass(frozen=True)
class CardEvaluation:
    card: Card
    accepted: bool
    rejection_reason: str | None
    multiplier: Decimal
    rate_source: str
    rate_label: str
    yield_pct: Decimal  # unrounded percent; round only for display
    points: int | None  # None for cash-back cards
    value_cents: int  # 0 when the card is rejected
    rank: int | None = None  # 1-based among accepted cards; None when rejected

    @property
    def is_winner(self) -> bool:
        return self.rank == 1


def evaluate_card(card: Card, merchant: Merchant, amount_cents: int) -> CardEvaluation:
    if amount_cents < 0:
        raise EngineError("invalid_amount", "Amount must not be negative.")
    rate = lookup_rate(card, merchant)
    yield_pct = rate.multiplier * card.cpp
    accepted = card.network in merchant.accepts
    rejection = None
    if not accepted:
        network = NETWORK_LABELS.get(card.network, card.network)
        rejection = f"{network} rejected by {merchant.name} terminal"
    amount = Decimal(amount_cents)
    value_cents = round_cents(amount * yield_pct / HUNDRED) if accepted else 0
    points = None
    if card.reward_type == "points":
        points = round_whole(amount / HUNDRED * rate.multiplier) if accepted else 0
    return CardEvaluation(
        card=card,
        accepted=accepted,
        rejection_reason=rejection,
        multiplier=rate.multiplier,
        rate_source=rate.source,
        rate_label=rate_label(card, merchant, rate),
        yield_pct=yield_pct,
        points=points,
        value_cents=value_cents,
    )


def rank_cards(cards: Sequence[Card], merchant: Merchant, amount_cents: int) -> list[CardEvaluation]:
    """Accepted cards by reward value (then yield, then wallet order); rejected cards last.

    Rejected cards never receive a rank, so they can never win.
    """
    evaluations = [evaluate_card(card, merchant, amount_cents) for card in cards]
    order = {card.id: i for i, card in enumerate(cards)}
    accepted = sorted(
        (e for e in evaluations if e.accepted),
        key=lambda e: (-e.value_cents, -e.yield_pct, order[e.card.id]),
    )
    rejected = [e for e in evaluations if not e.accepted]
    ranked = [_with_rank(e, i + 1) for i, e in enumerate(accepted)]
    return ranked + rejected


def _with_rank(evaluation: CardEvaluation, rank: int) -> CardEvaluation:
    return CardEvaluation(**{**evaluation.__dict__, "rank": rank})


def winner_of(ranking: Iterable[CardEvaluation]) -> CardEvaluation | None:
    return next((e for e in ranking if e.rank == 1), None)


# --------------------------------------------------------------------------- why


def build_why(ranking: list[CardEvaluation], merchant: Merchant, amount_cents: int) -> dict | None:
    """Plain-data explanation of why the winner won. None when no card is accepted."""
    winner = winner_of(ranking)
    if winner is None:
        return None
    runner_up = next((e for e in ranking if e.rank == 2), None)
    debit = next((e for e in ranking if e.card.is_default_debit), None)
    card = winner.card
    network = NETWORK_LABELS.get(card.network, card.network)
    base_yield = card.base_rate * card.cpp
    net = round_pct(winner.yield_pct)
    if card.reward_type == "points":
        summary = (
            f"{_fmt_num(round_pct(base_yield))}% base → {_fmt_num(winner.multiplier)}x points "
            f"@ {_fmt_num(card.cpp)}¢ = {_fmt_num(net)}% net value"
        )
    else:
        summary = f"{_fmt_num(round_pct(base_yield))}% base → {_fmt_num(net)}% cash back"

    def margin(other: CardEvaluation | None) -> dict | None:
        if other is None:
            return None
        return {
            "card_id": other.card.id,
            "card_name": other.card.name,
            "value_cents": other.value_cents,
            "advantage_cents": winner.value_cents - other.value_cents,
            "advantage_pct": round_pct(winner.yield_pct - (other.yield_pct if other.accepted else ZERO)),
        }

    return {
        "network": {
            "network": card.network,
            "label": f"{network} accepted here",
            "rejections": [
                {"card_id": e.card.id, "network": e.card.network, "label": e.rejection_reason}
                for e in ranking
                if not e.accepted
            ],
        },
        "mcc": {
            "code": merchant.mcc,
            "label": merchant.mcc_label,
            "category": merchant.category,
            "category_label": CATEGORY_LABELS.get(merchant.category, merchant.category),
            "note": merchant.mcc_note,
        },
        "rate": {
            "multiplier": winner.multiplier,
            "source": winner.rate_source,
            "label": winner.rate_label,
        },
        "valuation": {
            "reward_type": card.reward_type,
            "base_yield_pct": round_pct(base_yield),
            "multiplier": winner.multiplier,
            "cpp": card.cpp,
            "net_yield_pct": net,
            "summary": summary,
        },
        "advantage": {
            "runner_up": margin(runner_up),
            "default_debit": margin(debit) if debit is not None and debit is not winner else None,
        },
        "amount_cents": amount_cents,
    }


# --------------------------------------------------------------------------- coupons


@dataclass(frozen=True)
class CouponCheck:
    coupon: Coupon
    eligible: bool
    reason: str | None  # why it is ineligible
    savings_cents: int


def check_coupon(coupon: Coupon, subtotal_cents: int, shipping_cents: int | None) -> CouponCheck:
    """Savings for one coupon. Percent and fixed coupons apply to the item subtotal only."""
    if subtotal_cents < coupon.min_spend_cents:
        return CouponCheck(coupon, False, f"Requires ${coupon.min_spend_cents / 100:.2f} minimum spend", 0)
    if coupon.kind == "percent":
        savings = round_cents(Decimal(subtotal_cents) * coupon.value / HUNDRED)
    elif coupon.kind == "fixed":
        savings = min(int(coupon.value), subtotal_cents)
    elif coupon.kind == "shipping":
        if shipping_cents is None:
            return CouponCheck(coupon, False, "Shipping cost unknown", 0)
        savings = shipping_cents
    else:
        return CouponCheck(coupon, False, f"Unsupported coupon type {coupon.kind!r}", 0)
    if coupon.max_discount_cents is not None:
        savings = min(savings, coupon.max_discount_cents)
    if savings <= 0:
        return CouponCheck(coupon, False, "No savings on this order", 0)
    return CouponCheck(coupon, True, None, savings)


def best_coupon(
    coupons: Sequence[Coupon], subtotal_cents: int, shipping_cents: int | None
) -> tuple[CouponCheck | None, list[CouponCheck]]:
    checks = [check_coupon(c, subtotal_cents, shipping_cents) for c in coupons]
    eligible = [c for c in checks if c.eligible]
    best = max(eligible, key=lambda c: c.savings_cents, default=None)  # first wins ties
    return best, checks


# --------------------------------------------------------------------------- stack


@dataclass(frozen=True)
class Stack:
    merchant: Merchant
    subtotal_cents: int
    shipping_cents: int | None
    original_total_cents: int  # subtotal + known shipping, before any coupon
    coupon: CouponCheck | None
    coupons_considered: list[CouponCheck]
    charge_cents: int  # what the card is charged after the coupon
    ranking: list[CardEvaluation]
    winner: CardEvaluation | None
    rewards_value_cents: int
    total_value_cents: int
    total_value_pct: Decimal


def _validate_amounts(subtotal_cents: int, shipping_cents: int | None) -> None:
    if subtotal_cents <= 0:
        raise EngineError("invalid_amount", "Subtotal must be greater than zero.")
    if shipping_cents is not None and shipping_cents < 0:
        raise EngineError("invalid_amount", "Shipping must not be negative.")


def triple_stack(
    cards: Sequence[Card],
    merchant: Merchant,
    subtotal_cents: int,
    shipping_cents: int | None = None,
    coupons: Sequence[Coupon] | None = None,
) -> Stack:
    """Layer 1 best coupon, layer 2 best card on the post-coupon charge, layer 3 combined value.

    total value % = (coupon savings + rewards) / original total, where original
    total is the item subtotal plus shipping when shipping is known.
    """
    _validate_amounts(subtotal_cents, shipping_cents)
    coupons = merchant.coupons if coupons is None else coupons
    coupon, considered = best_coupon(coupons, subtotal_cents, shipping_cents)
    original_total = subtotal_cents + (shipping_cents or 0)
    savings = coupon.savings_cents if coupon else 0
    charge = original_total - savings
    ranking = rank_cards(cards, merchant, charge)
    winner = winner_of(ranking)
    rewards = winner.value_cents if winner else 0
    total = savings + rewards
    return Stack(
        merchant=merchant,
        subtotal_cents=subtotal_cents,
        shipping_cents=shipping_cents,
        original_total_cents=original_total,
        coupon=coupon,
        coupons_considered=considered,
        charge_cents=charge,
        ranking=ranking,
        winner=winner,
        rewards_value_cents=rewards,
        total_value_cents=total,
        total_value_pct=round_pct(Decimal(total) * HUNDRED / Decimal(original_total)),
    )


# --------------------------------------------------------------------------- purchases


def missed_rewards(best_value_cents: int, used_value_cents: int) -> int:
    return max(best_value_cents - used_value_cents, 0)


@dataclass(frozen=True)
class PurchaseEvaluation:
    merchant: Merchant
    subtotal_cents: int
    shipping_cents: int | None
    coupon: CouponCheck | None
    charge_cents: int
    used: CardEvaluation
    best: CardEvaluation | None
    earned_cents: int
    best_possible_cents: int
    missed_cents: int


def evaluate_purchase(
    cards: Sequence[Card],
    merchant: Merchant,
    subtotal_cents: int,
    card_used_id: str,
    coupon_code: str | None = None,
    shipping_cents: int | None = None,
    coupons: Sequence[Coupon] | None = None,
) -> PurchaseEvaluation:
    """Server-side reward maths for one logged purchase.

    The optional coupon must belong to the merchant and be eligible for this
    order. Both the used card and the best card are evaluated on the same
    post-coupon charge. A card the merchant rejects earns zero.
    """
    _validate_amounts(subtotal_cents, shipping_cents)
    by_id = {c.id: c for c in cards}
    if card_used_id not in by_id:
        raise EngineError("card_not_found", f"Unknown card id {card_used_id!r}.")
    coupons = merchant.coupons if coupons is None else coupons
    applied: CouponCheck | None = None
    if coupon_code:
        match = next((c for c in coupons if c.code.upper() == coupon_code.strip().upper()), None)
        if match is None:
            raise EngineError("coupon_not_found", f"Coupon {coupon_code!r} is not available at {merchant.name}.")
        applied = check_coupon(match, subtotal_cents, shipping_cents)
        if not applied.eligible:
            raise EngineError("coupon_not_eligible", f"Coupon {match.code} does not apply: {applied.reason}.")
    charge = subtotal_cents + (shipping_cents or 0) - (applied.savings_cents if applied else 0)
    ranking = rank_cards(cards, merchant, charge)
    best = winner_of(ranking)
    used = next(e for e in ranking if e.card.id == card_used_id)
    best_possible = best.value_cents if best else 0
    return PurchaseEvaluation(
        merchant=merchant,
        subtotal_cents=subtotal_cents,
        shipping_cents=shipping_cents,
        coupon=applied,
        charge_cents=charge,
        used=used,
        best=best,
        earned_cents=used.value_cents,
        best_possible_cents=best_possible,
        missed_cents=missed_rewards(best_possible, used.value_cents),
    )
