from decimal import Decimal

import pytest

from data import WALLET, Coupon, get_merchant, unknown_merchant
from engine import (
    EngineError,
    best_coupon,
    build_why,
    check_coupon,
    evaluate_purchase,
    lookup_rate,
    missed_rewards,
    rank_cards,
    triple_stack,
    winner_of,
)
from data import get_card


def merchant(mid):
    m = get_merchant(mid)
    assert m is not None
    return m


@pytest.mark.parametrize(
    "merchant_id, winner_id, yield_pct",
    [
        ("trader-joes", "amex-gold", Decimal("7.2")),
        ("costco", "chase-freedom", Decimal("5")),
        ("target", "venture-x", Decimal("2.8")),
        ("delta", "amex-gold", Decimal("5.4")),
        ("marriott", "chase-sapphire", Decimal("3.0")),
        ("nike", "apple-card", Decimal("3")),
    ],
)
def test_required_winners(merchant_id, winner_id, yield_pct):
    winner = winner_of(rank_cards(WALLET, merchant(merchant_id), 10000))
    assert winner is not None
    assert winner.card.id == winner_id
    assert winner.yield_pct == yield_pct


def test_costco_rejects_amex_and_it_never_wins():
    ranking = rank_cards(WALLET, merchant("costco"), 10000)
    amex = next(e for e in ranking if e.card.id == "amex-gold")
    assert not amex.accepted
    assert amex.rank is None and amex.value_cents == 0
    assert amex.rejection_reason == "Amex rejected by Costco terminal"
    # Costco is Visa-only: Amex and the Mastercard Apple Card both sort after every accepted card.
    assert {e.card.id for e in ranking[-2:]} == {"amex-gold", "apple-card"}
    assert all(e.accepted for e in ranking[:-2])


def test_rate_lookup_order():
    apple, amex = get_card("apple-card"), get_card("amex-gold")
    assert lookup_rate(apple, merchant("nike")).source == "merchant"
    assert lookup_rate(amex, merchant("trader-joes")).source == "category"
    assert lookup_rate(amex, merchant("target")).source == "base"


def test_target_is_discount_store_so_no_grocery_bonus():
    amex = next(e for e in rank_cards(WALLET, merchant("target"), 10000) if e.card.id == "amex-gold")
    assert amex.rate_source == "base"
    assert amex.yield_pct == Decimal("1.8")


def test_trader_joes_4250_on_amex_gold():
    amex = next(e for e in rank_cards(WALLET, merchant("trader-joes"), 4250) if e.card.id == "amex-gold")
    assert amex.points == 170
    assert amex.value_cents == 306


def test_nike_save15_stack():
    stack = triple_stack(WALLET, merchant("nike"), 10000)
    assert stack.coupon is not None and stack.coupon.coupon.code == "SAVE15"
    assert stack.coupon.savings_cents == 1500
    assert stack.charge_cents == 8500
    assert stack.winner.card.id == "apple-card"
    assert stack.rewards_value_cents == 255
    assert stack.total_value_cents == 1755
    assert stack.total_value_pct == Decimal("17.55")


def test_no_accepted_card():
    discover_only = unknown_merchant("Discover Mart")
    discover_only = type(discover_only)(**{**discover_only.__dict__, "accepts": ("discover",)})
    ranking = rank_cards(WALLET, discover_only, 5000)
    assert winner_of(ranking) is None
    assert all(e.rank is None for e in ranking)
    assert build_why(ranking, discover_only, 5000) is None
    stack = triple_stack(WALLET, discover_only, 5000, coupons=())
    assert stack.winner is None and stack.rewards_value_cents == 0


def test_coupon_min_spend_cap_and_shipping():
    pct = Coupon("P", "percent", Decimal("20"), "", min_spend_cents=4000, max_discount_cents=500)
    assert not check_coupon(pct, 3999, None).eligible
    assert check_coupon(pct, 4000, None).savings_cents == 500  # 20% of $40 = $8, capped at $5
    fixed = Coupon("F", "fixed", Decimal("1000"), "")
    assert check_coupon(fixed, 600, None).savings_cents == 600  # never more than the subtotal
    ship = Coupon("S", "shipping", Decimal("0"), "")
    unknown = check_coupon(ship, 5000, None)
    assert not unknown.eligible and unknown.reason == "Shipping cost unknown"
    assert check_coupon(ship, 5000, 799).savings_cents == 799


def test_best_coupon_picks_largest_savings():
    nike = merchant("nike")
    best, checks = best_coupon(nike.coupons, 4000, None)  # below SAVE15 minimum
    assert best.coupon.code == "WELCOME10"
    assert len(checks) == 3
    best, _ = best_coupon(nike.coupons, 4000, 1500)  # $15 shipping beats $10 off
    assert best.coupon.code == "FREESHIP"


def test_shipping_included_in_charge_and_denominator():
    stack = triple_stack(WALLET, merchant("nike"), 10000, shipping_cents=800)
    assert stack.coupon.coupon.code == "SAVE15"
    assert stack.original_total_cents == 10800
    assert stack.charge_cents == 9300


def test_missed_rewards_never_negative():
    assert missed_rewards(300, 100) == 200
    assert missed_rewards(100, 300) == 0


def test_debit_purchase_missed():
    p = evaluate_purchase(WALLET, merchant("trader-joes"), 4250, "everyday-debit")
    assert p.earned_cents == 0
    assert p.best.card.id == "amex-gold"
    assert p.best_possible_cents == 306
    assert p.missed_cents == 306


def test_discounted_purchase_compares_on_post_coupon_charge():
    p = evaluate_purchase(WALLET, merchant("nike"), 10000, "everyday-debit", coupon_code="save15")
    assert p.charge_cents == 8500
    assert p.best_possible_cents == 255
    assert p.missed_cents == 255
    p2 = evaluate_purchase(WALLET, merchant("nike"), 10000, "venture-x", coupon_code="SAVE15")
    assert p2.earned_cents == 238  # 2.8% of $85 = 2.38
    assert p2.missed_cents == 17


def test_rejected_used_card_earns_zero():
    p = evaluate_purchase(WALLET, merchant("costco"), 10000, "amex-gold")
    assert p.earned_cents == 0 and p.missed_cents == 500


def test_purchase_validation():
    with pytest.raises(EngineError) as e:
        evaluate_purchase(WALLET, merchant("nike"), 10000, "no-such-card")
    assert e.value.code == "card_not_found"
    with pytest.raises(EngineError) as e:
        evaluate_purchase(WALLET, merchant("nike"), 10000, "apple-card", coupon_code="BOGUS")
    assert e.value.code == "coupon_not_found"
    with pytest.raises(EngineError) as e:
        evaluate_purchase(WALLET, merchant("nike"), 3000, "apple-card", coupon_code="SAVE15")
    assert e.value.code == "coupon_not_eligible"
    with pytest.raises(EngineError):
        triple_stack(WALLET, merchant("nike"), 0)


def test_why_breakdown():
    ranking = rank_cards(WALLET, merchant("costco"), 10000)
    why = build_why(ranking, merchant("costco"), 10000)
    assert why["network"]["label"] == "Visa accepted here"
    assert why["network"]["rejections"][0]["card_id"] == "amex-gold"
    assert why["mcc"]["code"] == "5300"
    assert why["advantage"]["default_debit"]["advantage_cents"] == 500
    assert why["advantage"]["runner_up"]["card_id"] == "venture-x"
    tj = build_why(rank_cards(WALLET, merchant("trader-joes"), 4250), merchant("trader-joes"), 4250)
    assert tj["valuation"]["summary"] == "1.8% base → 4x points @ 1.8¢ = 7.2% net value"
