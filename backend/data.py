"""Demo fixtures: the mock wallet, merchants, store locations, and coupons.

Everything here is demo data. Rates, MCC codes, network acceptance, and coupon
codes are realistic assumptions chosen for the hackathon demo; none of it is
verified against a real issuer, merchant, or card network.

Units:
- Money is integer cents.
- Card rates are multipliers. For points cards, yield % = multiplier x cents per point.
  Cash-back cards use cpp = 1, so a 5x multiplier is 5% cash back.
- Percent coupons store the percentage (15 means 15% off).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from decimal import Decimal

D = Decimal

NETWORKS = ("visa", "mastercard", "amex")
NETWORK_LABELS = {"visa": "Visa", "mastercard": "Mastercard", "amex": "Amex", "discover": "Discover"}

CATEGORY_LABELS = {
    "grocery": "Grocery",
    "wholesale_club": "Wholesale club",
    "discount_store": "Discount store",
    "dining": "Dining",
    "airfare": "Airfare",
    "hotel": "Hotel",
    "travel": "Travel",
    "travel_portal": "Travel portal",
    "gas": "Gas",
    "drugstore": "Drugstore",
    "apparel": "Apparel",
    "general": "General retail",
}

DEAL_FEEDS = {
    "meals": {"label": "Meals", "emoji": "🍔"},
    "clothing": {"label": "Clothing", "emoji": "👕"},
    "travel": {"label": "Travel", "emoji": "✈️"},
}


@dataclass(frozen=True)
class Card:
    id: str
    name: str
    issuer: str
    network: str
    last4: str
    reward_type: str  # "points" | "cash"
    cpp: Decimal  # cents per point; 1 for cash back
    base_rate: Decimal
    category_rates: dict[str, Decimal] = field(default_factory=dict)
    merchant_rates: dict[str, Decimal] = field(default_factory=dict)
    gradient: tuple[str, str] = ("#333333", "#111111")
    glow: str = "#ffffff"
    text_color: str = "#ffffff"
    is_default_debit: bool = False
    type: str = ""
    user_id: str = "demo"

    def __post_init__(self):
        if not self.type:
            object.__setattr__(self, "type", self.id)


@dataclass(frozen=True)
class Coupon:
    code: str
    kind: str  # "percent" | "fixed" | "shipping"
    value: Decimal  # percent for "percent", cents for "fixed", ignored for "shipping"
    description: str
    min_spend_cents: int = 0
    max_discount_cents: int | None = None
    source: str = "demo_catalog"  # "demo_catalog" | "ai_simulated" | "simulated_fallback"


@dataclass(frozen=True)
class Merchant:
    id: str
    name: str
    category: str
    mcc: str
    mcc_label: str
    accepts: tuple[str, ...]
    channels: tuple[str, ...]
    typical_cents: int
    coupons: tuple[Coupon, ...] = ()
    mcc_note: str | None = None
    deal_feed: str | None = None
    address: str | None = None
    emoji: str = "🛍️"
    aliases: tuple[str, ...] = ()
    known: bool = True


ALL_NETWORKS = NETWORKS

WALLET: tuple[Card, ...] = (
    Card(
        id="amex-gold",
        name="Amex Gold",
        issuer="American Express",
        network="amex",
        last4="4821",
        reward_type="points",
        cpp=D("1.8"),
        base_rate=D("1"),
        category_rates={"dining": D("4"), "grocery": D("4"), "airfare": D("3")},
        gradient=("#d4af37", "#8a6d1d"),
        glow="#f5c84c",
        text_color="#1a1405",
    ),
    Card(
        id="chase-sapphire",
        name="Chase Sapphire",
        issuer="Chase",
        network="visa",
        last4="7734",
        reward_type="points",
        cpp=D("1.5"),
        base_rate=D("1"),
        category_rates={"dining": D("3"), "airfare": D("2"), "hotel": D("2"), "travel": D("2")},
        merchant_rates={"chase-travel": D("5")},
        gradient=("#1e3a8a", "#0b1533"),
        glow="#4f7cff",
    ),
    Card(
        id="chase-freedom",
        name="Chase Freedom",
        issuer="Chase",
        network="visa",
        last4="3310",
        reward_type="cash",
        cpp=D("1"),
        base_rate=D("1"),
        category_rates={"wholesale_club": D("5"), "gas": D("5"), "dining": D("3"), "drugstore": D("3")},
        gradient=("#38bdf8", "#1d4ed8"),
        glow="#5cc8ff",
    ),
    Card(
        id="venture-x",
        name="Venture X",
        issuer="Capital One",
        network="visa",
        last4="5508",
        reward_type="points",
        cpp=D("1.4"),
        base_rate=D("2"),
        merchant_rates={"capital-one-travel": D("5")},
        gradient=("#334155", "#0f172a"),
        glow="#94a3b8",
    ),
    Card(
        id="apple-card",
        name="Apple Card",
        issuer="Goldman Sachs",
        network="mastercard",
        last4="9012",
        reward_type="cash",
        cpp=D("1"),
        base_rate=D("2"),
        merchant_rates={"nike": D("3"), "ubereats": D("3")},
        gradient=("#f8fafc", "#cbd5e1"),
        glow="#ffffff",
        text_color="#0f172a",
    ),
    Card(
        id="everyday-debit",
        name="Everyday Debit",
        issuer="Demo Bank",
        network="visa",
        last4="0042",
        reward_type="cash",
        cpp=D("1"),
        base_rate=D("0"),
        gradient=("#475569", "#1e293b"),
        glow="#64748b",
        is_default_debit=True,
    ),
)

DEFAULT_DEBIT_ID = "everyday-debit"


def _c(code: str, kind: str, value: str | int, description: str, min_spend: int = 0, cap: int | None = None) -> Coupon:
    return Coupon(
        code=code,
        kind=kind,
        value=D(str(value)),
        description=description,
        min_spend_cents=min_spend,
        max_discount_cents=cap,
    )


_FREESHIP = _c("FREESHIP", "shipping", 0, "Free standard shipping")

MERCHANTS: tuple[Merchant, ...] = (
    # In-store locations
    Merchant(
        id="trader-joes", name="Trader Joe's", category="grocery", mcc="5411",
        mcc_label="Grocery Stores, Supermarkets", mcc_note="Classified as a supermarket",
        accepts=ALL_NETWORKS, channels=("store",), typical_cents=4250,
        address="142 E 14th St, New York, NY", emoji="🛒", aliases=("trader joes", "tjs"),
    ),
    Merchant(
        id="costco", name="Costco", category="wholesale_club", mcc="5300",
        mcc_label="Wholesale Clubs", mcc_note="Warehouse club, not a supermarket; Visa-only terminals",
        accepts=("visa",), channels=("store",), typical_cents=18740,
        address="517 E 117th St, New York, NY", emoji="📦", aliases=("costco wholesale",),
    ),
    Merchant(
        id="whole-foods", name="Whole Foods", category="grocery", mcc="5411",
        mcc_label="Grocery Stores, Supermarkets", mcc_note="Classified as a supermarket",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=6830,
        coupons=(_c("FRESH10", "percent", 10, "10% off orders over $35", 3500, 1000),),
        address="4 Union Square S, New York, NY", emoji="🥑", aliases=("whole foods market", "wholefoods"),
    ),
    Merchant(
        id="target", name="Target", category="discount_store", mcc="5310",
        mcc_label="Discount Stores", mcc_note="Coded as a discount store, not a supermarket, so grocery bonuses do not apply",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=6415,
        coupons=(_c("CIRCLE5", "percent", 5, "5% off your order"), _FREESHIP),
        address="255 Greenwich St, New York, NY", emoji="🎯",
    ),
    Merchant(
        id="chipotle", name="Chipotle", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=1485, deal_feed="meals",
        coupons=(_c("GUAC3", "fixed", 300, "$3 off orders of $15+", 1500),),
        address="864 Broadway, New York, NY", emoji="🌯",
    ),
    Merchant(
        id="sweetgreen", name="Sweetgreen", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=1650, deal_feed="meals",
        coupons=(_c("GREEN20", "percent", 20, "20% off your first order, up to $5", 0, 500),),
        address="1164 Broadway, New York, NY", emoji="🥗",
    ),
    Merchant(
        id="starbucks", name="Starbucks", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=785, deal_feed="meals",
        address="1 Astor Pl, New York, NY", emoji="☕",
    ),
    Merchant(
        id="shell", name="Shell", category="gas", mcc="5541",
        mcc_label="Service Stations", mcc_note="Classified as a gas station",
        accepts=ALL_NETWORKS, channels=("store",), typical_cents=5200,
        address="2420 Amsterdam Ave, New York, NY", emoji="⛽",
    ),
    Merchant(
        id="cvs", name="CVS", category="drugstore", mcc="5912",
        mcc_label="Drug Stores and Pharmacies", mcc_note="Classified as a drugstore",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=2399,
        coupons=(_c("CARE20", "percent", 20, "20% off $50+, up to $10", 5000, 1000),),
        address="298 1st Ave, New York, NY", emoji="💊",
    ),
    Merchant(
        id="nike", name="Nike", category="apparel", mcc="5661",
        mcc_label="Shoe Stores", mcc_note="Merchant-specific bonus on some cards",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=10000, deal_feed="clothing",
        coupons=(
            _c("SAVE15", "percent", 15, "15% off orders of $50+", 5000),
            _c("WELCOME10", "fixed", 1000, "$10 off your first order"),
            _FREESHIP,
        ),
        address="650 5th Ave, New York, NY", emoji="👟",
    ),
    # Online / deals feed
    Merchant(
        id="ubereats", name="UberEats", category="dining", mcc="5812",
        mcc_label="Eating Places, Restaurants", mcc_note="Delivery counts as dining",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=3200, deal_feed="meals",
        coupons=(_c("EATS25", "percent", 25, "25% off $20+, up to $15", 2000, 1500),),
        emoji="🛵", aliases=("uber eats",),
    ),
    Merchant(
        id="doordash", name="DoorDash", category="dining", mcc="5812",
        mcc_label="Eating Places, Restaurants", mcc_note="Delivery counts as dining",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=2800, deal_feed="meals",
        coupons=(_c("DASH5", "fixed", 500, "$5 off orders of $25+", 2500),),
        emoji="🥡", aliases=("door dash",),
    ),
    Merchant(
        id="uniqlo", name="Uniqlo", category="apparel", mcc="5651",
        mcc_label="Family Clothing Stores",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=7900, deal_feed="clothing",
        coupons=(_c("UNIQ10", "percent", 10, "10% off orders of $75+", 7500), _FREESHIP),
        emoji="🧥",
    ),
    Merchant(
        id="lululemon", name="Lululemon", category="apparel", mcc="5655",
        mcc_label="Sports and Riding Apparel Stores",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=12800, deal_feed="clothing",
        coupons=(_c("LULU20", "fixed", 2000, "$20 off orders of $100+", 10000),),
        emoji="🧘",
    ),
    Merchant(
        id="hm", name="H&M", category="apparel", mcc="5651",
        mcc_label="Family Clothing Stores",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=6000, deal_feed="clothing",
        coupons=(_c("HM20", "percent", 20, "20% off $40+, up to $25", 4000, 2500),),
        emoji="👕", aliases=("h and m", "h&m"),
    ),
    Merchant(
        id="delta", name="Delta", category="airfare", mcc="3058",
        mcc_label="Delta Air Lines", mcc_note="Airline MCC counts as airfare",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=38900, deal_feed="travel",
        coupons=(_c("FLY50", "fixed", 5000, "$50 off fares of $300+", 30000),),
        emoji="✈️", aliases=("delta air lines", "delta airlines"),
    ),
    Merchant(
        id="marriott", name="Marriott", category="hotel", mcc="3509",
        mcc_label="Marriott Hotels", mcc_note="Hotel MCC counts as travel",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=24900, deal_feed="travel",
        coupons=(_c("STAY15", "percent", 15, "15% off stays of $200+, up to $75", 20000, 7500),),
        emoji="🏨", aliases=("marriott hotels", "marriott bonvoy"),
    ),
    Merchant(
        id="airbnb", name="Airbnb", category="travel", mcc="4722",
        mcc_label="Travel Agencies and Tour Operators", mcc_note="Counts as travel",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=31200, deal_feed="travel",
        coupons=(_c("AWAY40", "fixed", 4000, "$40 off stays of $250+", 25000),),
        emoji="🏡",
    ),
    Merchant(
        id="chase-travel", name="Chase Travel portal", category="travel_portal", mcc="4722",
        mcc_label="Travel Agencies and Tour Operators", mcc_note="Issuer portal: Sapphire earns its portal rate here",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=42000, deal_feed="travel",
        emoji="🧳", aliases=("chase travel", "chase portal"),
    ),
    Merchant(
        id="capital-one-travel", name="Capital One Travel portal", category="travel_portal", mcc="4722",
        mcc_label="Travel Agencies and Tour Operators", mcc_note="Issuer portal: Venture X earns its portal rate here",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=42000, deal_feed="travel",
        emoji="🌍", aliases=("capital one travel", "capital one portal"),
    ),
)

IN_STORE_LOCATION_IDS = (
    "trader-joes", "costco", "whole-foods", "target", "chipotle",
    "sweetgreen", "starbucks", "shell", "cvs", "nike",
)

# Fake distances so the location picker feels like "nearby stores".
_LOCATION_DISTANCE_M = {
    "trader-joes": 120, "costco": 2400, "whole-foods": 350, "target": 900, "chipotle": 60,
    "sweetgreen": 210, "starbucks": 40, "shell": 1600, "cvs": 180, "nike": 1100,
}

_BY_ID = {m.id: m for m in MERCHANTS}
_CARDS_BY_ID = {c.id: c for c in WALLET}


def normalize_name(name: str) -> str:
    """Lowercase and strip everything but letters and digits: "Trader Joe's" -> "traderjoes"."""
    return re.sub(r"[^a-z0-9]", "", name.lower().replace("&", "and"))


_BY_NORMALIZED: dict[str, Merchant] = {}
for _m in MERCHANTS:
    for _key in (_m.id, _m.name, *_m.aliases):
        _BY_NORMALIZED.setdefault(normalize_name(_key), _m)


def get_card(card_id: str) -> Card | None:
    return _CARDS_BY_ID.get(card_id)


def get_merchant(merchant_id: str) -> Merchant | None:
    return _BY_ID.get(merchant_id)


def find_merchant_by_name(name: str) -> Merchant | None:
    key = normalize_name(name)
    return _BY_NORMALIZED.get(key) if key else None


def unknown_merchant(name: str, category: str = "general") -> Merchant:
    """Synthesize a merchant that is not in the dictionary.

    Assumption for the demo: unknown stores accept every network and use the
    category Gemini suggests (or "general"). Coupons are attached separately.
    """
    category = category if category in CATEGORY_LABELS else "general"
    slug = normalize_name(name) or "unknown"
    return Merchant(
        id=f"unknown:{slug}",
        name=name.strip() or "Unknown store",
        category=category,
        mcc="5999",
        mcc_label="Miscellaneous Retail",
        mcc_note="Not in the demo merchant dictionary; category is estimated",
        accepts=ALL_NETWORKS,
        channels=("online",),
        typical_cents=5000,
        emoji="🏬",
        known=False,
    )


def location_distance_m(merchant_id: str) -> int:
    return _LOCATION_DISTANCE_M.get(merchant_id, 500)
