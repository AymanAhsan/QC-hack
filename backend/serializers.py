"""Convert engine and fixture objects into API contract models (schemas.py)."""

from __future__ import annotations

from data import CATEGORY_LABELS, Card, Coupon, Merchant
from engine import CardEvaluation, CouponCheck, Stack, build_why
import schemas as s

COUPON_LABELS = {
    "demo_catalog": "Demo coupon · not a verified offer",
    "ai_simulated": "AI-generated · simulated, not a verified offer",
    "simulated_fallback": "Simulated coupon · not a verified offer",
}


def card_out(card: Card) -> s.CardOut:
    return s.CardOut(
        id=card.id,
        name=card.name,
        issuer=card.issuer,
        network=card.network,
        last4=card.last4,
        reward_type=card.reward_type,
        cpp=float(card.cpp),
        base_rate=float(card.base_rate),
        category_rates={k: float(v) for k, v in card.category_rates.items()},
        merchant_rates={k: float(v) for k, v in card.merchant_rates.items()},
        gradient=card.gradient,
        glow=card.glow,
        text_color=card.text_color,
        is_default_debit=card.is_default_debit,
    )


def coupon_out(coupon: Coupon) -> s.CouponOut:
    return s.CouponOut(
        code=coupon.code,
        kind=coupon.kind,
        value=float(coupon.value),
        description=coupon.description,
        min_spend_cents=coupon.min_spend_cents,
        max_discount_cents=coupon.max_discount_cents,
        source=coupon.source,
        label=COUPON_LABELS.get(coupon.source, COUPON_LABELS["simulated_fallback"]),
    )


def merchant_out(merchant: Merchant, coupons: tuple[Coupon, ...] | None = None) -> s.MerchantOut:
    return s.MerchantOut(
        id=merchant.id,
        name=merchant.name,
        known=merchant.known,
        category=merchant.category,
        category_label=CATEGORY_LABELS.get(merchant.category, merchant.category),
        mcc=merchant.mcc,
        mcc_label=merchant.mcc_label,
        mcc_note=merchant.mcc_note,
        accepts=list(merchant.accepts),
        channels=list(merchant.channels),
        typical_cents=merchant.typical_cents,
        deal_feed=merchant.deal_feed,
        emoji=merchant.emoji,
        coupons=[coupon_out(c) for c in (merchant.coupons if coupons is None else coupons)],
    )


def evaluation_out(e: CardEvaluation) -> s.CardEvaluationOut:
    return s.CardEvaluationOut(
        card_id=e.card.id,
        card_name=e.card.name,
        network=e.card.network,
        accepted=e.accepted,
        rejection_reason=e.rejection_reason,
        multiplier=float(e.multiplier),
        rate_source=e.rate_source,
        rate_label=e.rate_label,
        yield_pct=round(float(e.yield_pct), 2),
        points=e.points,
        value_cents=e.value_cents,
        rank=e.rank,
        is_winner=e.is_winner,
    )


def coupon_check_out(c: CouponCheck) -> s.CouponCheckOut:
    return s.CouponCheckOut(coupon=coupon_out(c.coupon), eligible=c.eligible, reason=c.reason, savings_cents=c.savings_cents)


def why_out(ranking: list[CardEvaluation], merchant: Merchant, amount_cents: int) -> s.WhyBreakdown | None:
    why = build_why(ranking, merchant, amount_cents)
    return None if why is None else s.WhyBreakdown.model_validate(why)


def stack_out(stack: Stack, coupons: tuple[Coupon, ...] | None = None) -> s.StackResponse:
    return s.StackResponse(
        merchant=merchant_out(stack.merchant, coupons),
        merchant_known=stack.merchant.known,
        subtotal_cents=stack.subtotal_cents,
        shipping_cents=stack.shipping_cents,
        original_total_cents=stack.original_total_cents,
        coupon=coupon_check_out(stack.coupon) if stack.coupon else None,
        coupons_considered=[coupon_check_out(c) for c in stack.coupons_considered],
        charge_cents=stack.charge_cents,
        winner_card_id=stack.winner.card.id if stack.winner else None,
        no_accepted_card=stack.winner is None,
        ranking=[evaluation_out(e) for e in stack.ranking],
        rewards_value_cents=stack.rewards_value_cents,
        total_value_cents=stack.total_value_cents,
        total_value_pct=float(stack.total_value_pct),
    )
