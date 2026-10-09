"""API contract models. Mirrored by frontend/src/types.ts and documented in docs/API.md.

Conventions:
- Money: integer cents, fields end in `_cents`.
- Percentages: percent units (7.2 means 7.2%), fields end in `_pct`, 2 decimals.
- IDs: lowercase kebab-case strings. Unknown merchants use "unknown:<slug>".
- Request bodies reject unknown fields, so clients cannot submit reward totals.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Network = Literal["visa", "mastercard", "amex"]
RewardType = Literal["points", "cash"]
RateSource = Literal["merchant", "category", "base"]
CouponKind = Literal["percent", "fixed", "shipping"]
CouponSource = Literal["demo_catalog", "ai_simulated", "simulated_fallback"]
Channel = Literal["store", "online"]
DealFeed = Literal["meals", "clothing", "travel"]


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


# --------------------------------------------------------------------------- errors


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody


# --------------------------------------------------------------------------- wallet


class CardOut(BaseModel):
    id: str
    name: str
    issuer: str
    network: Network
    last4: str
    reward_type: RewardType
    cpp: float = Field(description="Cents per point. 1 for cash-back cards.")
    base_rate: float
    category_rates: dict[str, float]
    merchant_rates: dict[str, float]
    gradient: tuple[str, str]
    glow: str
    text_color: str
    is_default_debit: bool


class WalletResponse(BaseModel):
    cards: list[CardOut]
    default_debit_card_id: str
    is_demo_data: Literal[True] = True


class CouponOut(BaseModel):
    code: str
    kind: CouponKind
    value: float = Field(description="Percent for percent coupons, cents for fixed, 0 for shipping.")
    description: str
    min_spend_cents: int
    max_discount_cents: int | None
    source: CouponSource
    is_simulated: Literal[True] = True
    label: str


class MerchantOut(BaseModel):
    id: str
    name: str
    known: bool
    category: str
    category_label: str
    mcc: str
    mcc_label: str
    mcc_note: str | None
    accepts: list[Network]
    channels: list[Channel]
    typical_cents: int
    deal_feed: DealFeed | None
    emoji: str
    coupons: list[CouponOut]


class LocationOut(BaseModel):
    id: str
    merchant: MerchantOut
    address: str
    distance_m: int


class LocationsResponse(BaseModel):
    locations: list[LocationOut]
    is_demo_data: Literal[True] = True


# --------------------------------------------------------------------------- recommend


class CardEvaluationOut(BaseModel):
    card_id: str
    card_name: str
    network: Network
    accepted: bool
    rejection_reason: str | None
    multiplier: float
    rate_source: RateSource
    rate_label: str
    yield_pct: float
    points: int | None = Field(description="Null for cash-back cards; 0 when rejected.")
    value_cents: int
    rank: int | None = Field(description="1-based among accepted cards; null when rejected.")
    is_winner: bool


class WhyRejection(BaseModel):
    card_id: str
    network: Network
    label: str


class WhyNetwork(BaseModel):
    network: Network
    label: str
    rejections: list[WhyRejection]


class WhyMcc(BaseModel):
    code: str
    label: str
    category: str
    category_label: str
    note: str | None


class WhyRate(BaseModel):
    multiplier: float
    source: RateSource
    label: str


class WhyValuation(BaseModel):
    reward_type: RewardType
    base_yield_pct: float
    multiplier: float
    cpp: float
    net_yield_pct: float
    summary: str


class WhyMargin(BaseModel):
    card_id: str
    card_name: str
    value_cents: int
    advantage_cents: int
    advantage_pct: float


class WhyAdvantage(BaseModel):
    runner_up: WhyMargin | None
    default_debit: WhyMargin | None


class WhyBreakdown(BaseModel):
    network: WhyNetwork
    mcc: WhyMcc
    rate: WhyRate
    valuation: WhyValuation
    advantage: WhyAdvantage
    amount_cents: int


class RecommendResponse(BaseModel):
    merchant: MerchantOut
    amount_cents: int
    winner_card_id: str | None
    no_accepted_card: bool
    ranking: list[CardEvaluationOut]
    why: WhyBreakdown | None
    is_demo_data: Literal[True] = True


# --------------------------------------------------------------------------- stack


class StackRequest(StrictRequest):
    merchant_id: str | None = Field(default=None, description="Known merchant id. Takes precedence over merchant_name.")
    merchant_name: str | None = Field(default=None, max_length=80, description="Free-typed store name.")
    subtotal_cents: int = Field(gt=0, le=10_000_000)
    shipping_cents: int | None = Field(default=None, ge=0, le=1_000_000)


class CouponCheckOut(BaseModel):
    coupon: CouponOut
    eligible: bool
    reason: str | None
    savings_cents: int


class StackResponse(BaseModel):
    merchant: MerchantOut
    merchant_known: bool
    subtotal_cents: int
    shipping_cents: int | None
    original_total_cents: int
    coupon: CouponCheckOut | None
    coupons_considered: list[CouponCheckOut]
    charge_cents: int
    winner_card_id: str | None
    no_accepted_card: bool
    ranking: list[CardEvaluationOut]
    rewards_value_cents: int
    total_value_cents: int
    total_value_pct: float
    is_demo_data: Literal[True] = True


# --------------------------------------------------------------------------- deals


class DealOut(BaseModel):
    merchant: MerchantOut
    example_subtotal_cents: int
    coupon: CouponCheckOut | None
    winner_card_id: str | None
    winner_card_name: str | None
    card_yield_pct: float
    rewards_value_cents: int
    total_value_cents: int
    total_value_pct: float
    headline: str


class DealCategoryOut(BaseModel):
    id: DealFeed
    label: str
    emoji: str
    deals: list[DealOut]


class DealsResponse(BaseModel):
    categories: list[DealCategoryOut]
    is_demo_data: Literal[True] = True


# --------------------------------------------------------------------------- transactions (Ayman)


class TransactionCreate(StrictRequest):
    idempotency_key: str = Field(min_length=8, max_length=64, description="Client-generated UUID per purchase attempt.")
    merchant_id: str | None = None
    merchant_name: str | None = Field(default=None, max_length=80)
    subtotal_cents: int = Field(gt=0, le=10_000_000)
    shipping_cents: int | None = Field(default=None, ge=0, le=1_000_000)
    coupon_code: str | None = Field(default=None, max_length=40)
    card_used_id: str
    channel: Channel
    source: Literal["wallet", "scan", "seed"] = "wallet"


class TransactionOut(BaseModel):
    id: str
    ts: str = Field(description="ISO 8601 UTC timestamp.")
    merchant_id: str
    merchant_name: str
    category: str
    channel: Channel
    source: str
    subtotal_cents: int
    shipping_cents: int | None
    coupon_code: str | None
    coupon_savings_cents: int
    amount_cents: int = Field(description="Charged amount after coupon.")
    card_used_id: str
    best_card_id: str | None
    earned_cents: int
    best_possible_cents: int
    missed_cents: int
    points_earned: int | None
    is_simulated: Literal[True] = True


class TransactionCreateResponse(BaseModel):
    transaction: TransactionOut
    duplicate: bool


# --------------------------------------------------------------------------- missed (Ayman)


class DailyMissed(BaseModel):
    date: str = Field(description="YYYY-MM-DD in UTC.")
    missed_cents: int
    earned_cents: int
    count: int


class CategoryMissed(BaseModel):
    category: str
    category_label: str
    missed_cents: int


class MissedResponse(BaseModel):
    window_days: int
    window_label: str
    total_missed_cents: int
    total_earned_cents: int
    total_best_possible_cents: int
    transaction_count: int
    daily: list[DailyMissed]
    by_category: list[CategoryMissed]
    recent: list[TransactionOut]
    db_mode: str
    is_demo_data: Literal[True] = True


# --------------------------------------------------------------------------- cart (Nazeef)


class CartItem(BaseModel):
    name: str
    qty: int = Field(ge=1)
    price_cents: int = Field(ge=0, description="Line total for this item (qty x unit price).")


class ParsedCart(BaseModel):
    merchant_name: str
    merchant_id: str | None
    category: str
    items: list[CartItem]
    subtotal_cents: int
    shipping_cents: int | None


class CartParseResponse(BaseModel):
    source: Literal["gemini", "sample"]
    is_sample: bool
    warning: str | None
    cart: ParsedCart
    stack: StackResponse


# --------------------------------------------------------------------------- health


class HealthResponse(BaseModel):
    status: Literal["ok"]
    db_mode: str
    gemini_configured: bool
    version: str
