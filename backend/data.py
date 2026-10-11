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
    # Big national brands (added 2026-10-11). Physical ones have a real NYC location
    # from OpenStreetMap; logos are each company's App Store icon.
    Merchant(
        id="kroger", name="Kroger", category="grocery", mcc="5411",
        mcc_label="Grocery Stores, Supermarkets", mcc_note="Classified as a supermarket",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=6200,
        emoji="🛒",
    ),
    Merchant(
        id="safeway", name="Safeway", category="grocery", mcc="5411",
        mcc_label="Grocery Stores, Supermarkets", mcc_note="Classified as a supermarket",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=5900,
        emoji="🛒",
    ),
    Merchant(
        id="publix", name="Publix", category="grocery", mcc="5411",
        mcc_label="Grocery Stores, Supermarkets", mcc_note="Classified as a supermarket",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=5800,
        emoji="🛒", aliases=("publix super markets",),
    ),
    Merchant(
        id="wegmans", name="Wegmans", category="grocery", mcc="5411",
        mcc_label="Grocery Stores, Supermarkets", mcc_note="Classified as a supermarket",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=7400,
        address="21 Flushing Ave, Brooklyn, NY", emoji="🛒",
    ),
    Merchant(
        id="aldi", name="Aldi", category="grocery", mcc="5411",
        mcc_label="Grocery Stores, Supermarkets", mcc_note="Classified as a supermarket",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=4100,
        address="535 Morgan Ave, Brooklyn, NY", emoji="🛒",
    ),
    Merchant(
        id="stop-and-shop", name="Stop & Shop", category="grocery", mcc="5411",
        mcc_label="Grocery Stores, Supermarkets", mcc_note="Classified as a supermarket",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=5600,
        address="625 Atlantic Ave, Brooklyn, NY", emoji="🛒", aliases=("stop and shop", "stopnshop"),
    ),
    Merchant(
        id="sams-club", name="Sam's Club", category="wholesale_club", mcc="5300",
        mcc_label="Wholesale Clubs", mcc_note="Warehouse club, not a supermarket",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=16500,
        emoji="📦", aliases=("sams club", "sam's"),
    ),
    Merchant(
        id="bjs", name="BJ's", category="wholesale_club", mcc="5300",
        mcc_label="Wholesale Clubs", mcc_note="Warehouse club, not a supermarket",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=14200,
        address="34-60 48th St, Queens, NY", emoji="📦", aliases=("bj's wholesale club", "bjs wholesale"),
    ),
    Merchant(
        id="walmart", name="Walmart", category="discount_store", mcc="5310",
        mcc_label="Discount Stores", mcc_note="Coded as a discount store, not a supermarket, so grocery bonuses do not apply",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=7800,
        coupons=(_FREESHIP,),
        emoji="🛍️", aliases=("walmart supercenter", "wal-mart"),
    ),
    Merchant(
        id="dollar-general", name="Dollar General", category="discount_store", mcc="5331",
        mcc_label="Variety Stores", mcc_note="Coded as a variety store, not a supermarket",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=2300,
        address="1192 Myrtle Ave, Brooklyn, NY", emoji="🛍️",
    ),
    Merchant(
        id="mcdonalds", name="McDonald's", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=1150, deal_feed="meals",
        address="541 6th Ave, New York, NY", emoji="🍟", aliases=("mcdonald", "mcd"),
    ),
    Merchant(
        id="chick-fil-a", name="Chick-fil-A", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=1380, deal_feed="meals",
        address="700 6th Ave, New York, NY", emoji="🐔", aliases=("chick fil a", "chickfila"),
    ),
    Merchant(
        id="taco-bell", name="Taco Bell", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=1120, deal_feed="meals",
        address="18 E 14th St, New York, NY", emoji="🌮",
    ),
    Merchant(
        id="wendys", name="Wendy's", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=1240, deal_feed="meals",
        address="462 7th Ave, New York, NY", emoji="🍔",
    ),
    Merchant(
        id="burger-king", name="Burger King", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=1190, deal_feed="meals",
        address="1313 Broadway, New York, NY", emoji="🍔", aliases=("bk",),
    ),
    Merchant(
        id="subway", name="Subway", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=1090, deal_feed="meals",
        address="61 Lexington Ave, New York, NY", emoji="🥪",
    ),
    Merchant(
        id="dunkin", name="Dunkin'", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=690, deal_feed="meals",
        coupons=(_c("DUNK2", "fixed", 200, "$2 off orders of $8+", 800),),
        address="140 E 34th St, New York, NY", emoji="🍩", aliases=("dunkin donuts", "dunkin"),
    ),
    Merchant(
        id="shake-shack", name="Shake Shack", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=2150, deal_feed="meals",
        coupons=(_c("SHACK5", "fixed", 500, "$5 off orders of $25+", 2500),),
        address="20 3rd Ave, New York, NY", emoji="🍔",
    ),
    Merchant(
        id="panera", name="Panera", category="dining", mcc="5814",
        mcc_label="Fast Food Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=1640, deal_feed="meals",
        coupons=(_c("PANERA3", "fixed", 300, "$3 off orders of $12+", 1200),),
        address="330 7th Ave, New York, NY", emoji="🥖", aliases=("panera bread",),
    ),
    Merchant(
        id="dominos", name="Domino's", category="dining", mcc="5812",
        mcc_label="Eating Places, Restaurants", mcc_note="Counts as dining",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=2450, deal_feed="meals",
        coupons=(_c("PIZZA20", "percent", 20, "20% off $20+, up to $6", 2000, 600),),
        address="16 W 8th St, New York, NY", emoji="🍕", aliases=("domino's pizza", "dominos pizza"),
    ),
    Merchant(
        id="grubhub", name="Grubhub", category="dining", mcc="5812",
        mcc_label="Eating Places, Restaurants", mcc_note="Delivery counts as dining",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=3100, deal_feed="meals",
        coupons=(_c("GRUB10", "fixed", 1000, "$10 off orders of $30+", 3000),),
        emoji="🥡", aliases=("grub hub",),
    ),
    Merchant(
        id="exxon", name="Exxon", category="gas", mcc="5541",
        mcc_label="Service Stations", mcc_note="Classified as a gas station",
        accepts=ALL_NETWORKS, channels=("store",), typical_cents=5100,
        address="1193 Myrtle Ave, Brooklyn, NY", emoji="⛽", aliases=("exxonmobil", "exxon mobil", "mobil"),
    ),
    Merchant(
        id="bp", name="BP", category="gas", mcc="5541",
        mcc_label="Service Stations", mcc_note="Classified as a gas station",
        accepts=ALL_NETWORKS, channels=("store",), typical_cents=4900,
        emoji="⛽", aliases=("british petroleum",),
    ),
    Merchant(
        id="chevron", name="Chevron", category="gas", mcc="5541",
        mcc_label="Service Stations", mcc_note="Classified as a gas station",
        accepts=ALL_NETWORKS, channels=("store",), typical_cents=5400,
        emoji="⛽", aliases=("texaco",),
    ),
    Merchant(
        id="walgreens", name="Walgreens", category="drugstore", mcc="5912",
        mcc_label="Drug Stores and Pharmacies", mcc_note="Classified as a drugstore",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=2150,
        coupons=(_c("WAG25", "percent", 25, "25% off $40+, up to $10", 4000, 1000),),
        address="748 Manhattan Ave, Brooklyn, NY", emoji="💊", aliases=("duane reade",),
    ),
    Merchant(
        id="adidas", name="Adidas", category="apparel", mcc="5655",
        mcc_label="Sports and Riding Apparel Stores",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=11000, deal_feed="clothing",
        coupons=(_c("ADI20", "percent", 20, "20% off $60+, up to $40", 6000, 4000), _FREESHIP),
        address="115 Spring St, New York, NY", emoji="👟",
    ),
    Merchant(
        id="zara", name="Zara", category="apparel", mcc="5651",
        mcc_label="Family Clothing Stores",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=8900, deal_feed="clothing",
        coupons=(_c("ZARA10", "percent", 10, "10% off orders of $80+", 8000),),
        address="101 5th Ave, New York, NY", emoji="👗",
    ),
    Merchant(
        id="gap", name="Gap", category="apparel", mcc="5651",
        mcc_label="Family Clothing Stores",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=6800, deal_feed="clothing",
        coupons=(_c("GAP25", "percent", 25, "25% off $50+, up to $25", 5000, 2500),),
        address="156 5th Ave, New York, NY", emoji="👖",
    ),
    Merchant(
        id="old-navy", name="Old Navy", category="apparel", mcc="5651",
        mcc_label="Family Clothing Stores",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=5400, deal_feed="clothing",
        coupons=(_c("NAVY30", "percent", 30, "30% off $50+, up to $20", 5000, 2000),),
        address="1516 Broadway, New York, NY", emoji="👕",
    ),
    Merchant(
        id="foot-locker", name="Foot Locker", category="apparel", mcc="5661",
        mcc_label="Shoe Stores",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=12500, deal_feed="clothing",
        coupons=(_c("FL20", "fixed", 2000, "$20 off orders of $100+", 10000),),
        address="716 Broadway, New York, NY", emoji="👟", aliases=("footlocker",),
    ),
    Merchant(
        id="urban-outfitters", name="Urban Outfitters", category="apparel", mcc="5651",
        mcc_label="Family Clothing Stores",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=7600, deal_feed="clothing",
        coupons=(_c("URBAN15", "percent", 15, "15% off orders of $75+", 7500),),
        address="162 2nd Ave, New York, NY", emoji="🧢",
    ),
    Merchant(
        id="levis", name="Levi's", category="apparel", mcc="5651",
        mcc_label="Family Clothing Stores",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=9800, deal_feed="clothing",
        coupons=(_c("LEVIS20", "percent", 20, "20% off $80+, up to $30", 8000, 3000),),
        address="495 Broadway, New York, NY", emoji="👖", aliases=("levi strauss", "levi"),
    ),
    Merchant(
        id="tj-maxx", name="TJ Maxx", category="apparel", mcc="5651",
        mcc_label="Family Clothing Stores",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=5900, deal_feed="clothing",
        address="620 6th Ave, New York, NY", emoji="🏷️", aliases=("tjmaxx", "t.j. maxx", "tj max"),
    ),
    Merchant(
        id="amazon", name="Amazon", category="general", mcc="5399",
        mcc_label="Misc. General Merchandise",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=5400,
        coupons=(_FREESHIP,),
        emoji="📦", aliases=("amazon.com", "amzn"),
    ),
    Merchant(
        id="best-buy", name="Best Buy", category="general", mcc="5732",
        mcc_label="Electronics Stores", mcc_note="Counts as general retail",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=21900,
        address="52 E 14th St, New York, NY", emoji="🔌", aliases=("bestbuy",),
    ),
    Merchant(
        id="apple", name="Apple Store", category="general", mcc="5732",
        mcc_label="Electronics Stores", mcc_note="Counts as general retail",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=29900,
        address="767 5th Ave, New York, NY", emoji="🍏", aliases=("apple store", "apple fifth avenue"),
    ),
    Merchant(
        id="home-depot", name="Home Depot", category="general", mcc="5200",
        mcc_label="Home Supply Warehouse Stores", mcc_note="Counts as general retail",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=14800,
        address="980 3rd Ave, New York, NY", emoji="🔨", aliases=("the home depot", "homedepot"),
    ),
    Merchant(
        id="lowes", name="Lowe's", category="general", mcc="5200",
        mcc_label="Home Supply Warehouse Stores", mcc_note="Counts as general retail",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=13600,
        address="118 2nd Ave, Brooklyn, NY", emoji="🔨", aliases=("lowes home improvement",),
    ),
    Merchant(
        id="ikea", name="IKEA", category="general", mcc="5712",
        mcc_label="Furniture and Home Furnishings", mcc_note="Counts as general retail",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=18700,
        address="1 Beard St, Brooklyn, NY", emoji="🛋️",
    ),
    Merchant(
        id="macys", name="Macy's", category="general", mcc="5311",
        mcc_label="Department Stores", mcc_note="Counts as general retail",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=11800,
        address="151 W 34th St, New York, NY", emoji="🛍️", aliases=("macy",),
    ),
    Merchant(
        id="nordstrom", name="Nordstrom", category="general", mcc="5311",
        mcc_label="Department Stores", mcc_note="Counts as general retail",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=16400,
        address="235 W 57th St, New York, NY", emoji="🛍️", aliases=("nordstrom rack",),
    ),
    Merchant(
        id="sephora", name="Sephora", category="general", mcc="5977",
        mcc_label="Cosmetic Stores", mcc_note="Counts as general retail",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=7200,
        coupons=(_c("BEAUTY15", "percent", 15, "15% off orders of $50+", 5000),),
        address="21 9th Ave, New York, NY", emoji="💄",
    ),
    Merchant(
        id="ulta", name="Ulta Beauty", category="general", mcc="5977",
        mcc_label="Cosmetic Stores", mcc_note="Counts as general retail",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=5600,
        address="188 E 86th St, New York, NY", emoji="💄", aliases=("ulta beauty",),
    ),
    Merchant(
        id="barnes-and-noble", name="Barnes & Noble", category="general", mcc="5942",
        mcc_label="Book Stores", mcc_note="Counts as general retail",
        accepts=ALL_NETWORKS, channels=("store", "online"), typical_cents=3400,
        address="555 5th Ave, New York, NY", emoji="📚", aliases=("barnes and noble", "b&n"),
    ),
    Merchant(
        id="united", name="United Airlines", category="airfare", mcc="3000",
        mcc_label="United Airlines", mcc_note="Airline MCC counts as airfare",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=41200, deal_feed="travel",
        coupons=(_c("FLYUA75", "fixed", 7500, "$75 off fares of $500+", 50000),),
        emoji="✈️", aliases=("united airlines", "united air lines"),
    ),
    Merchant(
        id="american-airlines", name="American Airlines", category="airfare", mcc="3001",
        mcc_label="American Airlines", mcc_note="Airline MCC counts as airfare",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=39800, deal_feed="travel",
        emoji="✈️", aliases=("american airline", "aa"),
    ),
    Merchant(
        id="jetblue", name="JetBlue", category="airfare", mcc="3174",
        mcc_label="JetBlue Airways", mcc_note="Airline MCC counts as airfare",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=28600, deal_feed="travel",
        coupons=(_c("BLUE40", "fixed", 4000, "$40 off fares of $250+", 25000),),
        emoji="✈️", aliases=("jet blue", "jetblue airways"),
    ),
    Merchant(
        id="southwest", name="Southwest", category="airfare", mcc="3066",
        mcc_label="Southwest Airlines", mcc_note="Airline MCC counts as airfare",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=24500, deal_feed="travel",
        emoji="✈️", aliases=("southwest airlines",),
    ),
    Merchant(
        id="hilton", name="Hilton", category="hotel", mcc="3504",
        mcc_label="Hilton Hotels", mcc_note="Hotel MCC counts as travel",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=22900, deal_feed="travel",
        coupons=(_c("HILTON20", "percent", 20, "20% off stays of $250+, up to $80", 25000, 8000),),
        emoji="🏨", aliases=("hilton hotels", "hilton honors"),
    ),
    Merchant(
        id="hyatt", name="Hyatt", category="hotel", mcc="3640",
        mcc_label="Hyatt Hotels", mcc_note="Hotel MCC counts as travel",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=27400, deal_feed="travel",
        emoji="🏨", aliases=("world of hyatt", "hyatt hotels"),
    ),
    Merchant(
        id="expedia", name="Expedia", category="travel", mcc="4722",
        mcc_label="Travel Agencies and Tour Operators", mcc_note="Counts as travel",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=36800, deal_feed="travel",
        coupons=(_c("TRIP10", "percent", 10, "10% off trips of $300+, up to $50", 30000, 5000),),
        emoji="🧳",
    ),
    Merchant(
        id="uber", name="Uber", category="travel", mcc="4121",
        mcc_label="Taxicabs and Limousines", mcc_note="Rideshare counts as travel",
        accepts=ALL_NETWORKS, channels=("online",), typical_cents=2400,
        emoji="🚕", aliases=("uber rides",),
    ),
)

IN_STORE_LOCATION_IDS = (
    "trader-joes", "costco", "whole-foods", "target", "chipotle",
    "sweetgreen", "starbucks", "shell", "cvs", "nike",
    "wegmans", "aldi", "stop-and-shop", "bjs", "dollar-general", "mcdonalds", "chick-fil-a",
    "taco-bell", "wendys", "burger-king", "subway", "dunkin", "shake-shack", "panera", "dominos",
    "exxon", "walgreens", "adidas", "zara", "gap", "old-navy", "foot-locker", "urban-outfitters",
    "levis", "tj-maxx", "best-buy", "apple", "home-depot", "lowes", "ikea", "macys", "nordstrom",
    "sephora", "ulta", "barnes-and-noble",
)

# Fake distances so the location picker feels like "nearby stores".
_LOCATION_DISTANCE_M = {
    "trader-joes": 120, "costco": 2400, "whole-foods": 350, "target": 900, "chipotle": 60,
    "sweetgreen": 210, "starbucks": 40, "shell": 1600, "cvs": 180, "nike": 1100,
    # New brands: real distance from Union Square, rounded to 10 m.
    "wegmans": 4230, "aldi": 4580, "stop-and-shop": 5900, "bjs": 6500, "dollar-general": 6610,
    "mcdonalds": 560, "chick-fil-a": 740, "taco-bell": 190, "wendys": 1790, "burger-king": 1610,
    "subway": 820, "dunkin": 1480, "shake-shack": 660, "panera": 1330, "dominos": 690,
    "exxon": 6470, "walgreens": 3390, "adidas": 1570, "zara": 260, "gap": 460, "old-navy": 2430,
    "foot-locker": 820, "urban-outfitters": 760, "levis": 1720, "tj-maxx": 570, "best-buy": 180,
    "apple": 3440, "home-depot": 3470, "lowes": 7140, "ikea": 7370, "macys": 1670,
    "nordstrom": 3490, "sephora": 1390, "ulta": 5650, "barnes-and-noble": 2430,
}

# (latitude, longitude) of each in-store location's address, geocoded from
# OpenStreetMap. Good to roughly 100 m, which is all store detection needs.
LOCATION_COORDS: dict[str, tuple[float, float]] = {
    "trader-joes": (40.73342, -73.98788),
    "costco": (40.79564, -73.93088),
    "whole-foods": (40.73653, -73.98927),
    "target": (40.71453, -74.01127),
    "chipotle": (40.73732, -73.98996),
    "sweetgreen": (40.74482, -73.98863),
    "starbucks": (40.73005, -73.99205),
    "shell": (40.84793, -73.93138),
    "cvs": (40.73332, -73.98076),
    "nike": (40.75974, -73.97678),
    "wegmans": (40.69889, -73.97878),
    "aldi": (40.72224, -73.9393),
    "stop-and-shop": (40.68403, -73.97574),
    "bjs": (40.75205, -73.91643),
    "dollar-general": (40.6972, -73.93113),
    "mcdonalds": (40.73787, -73.99675),
    "chick-fil-a": (40.74225, -73.99304),
    "taco-bell": (40.73545, -73.99273),
    "wendys": (40.75197, -73.99016),
    "burger-king": (40.7503, -73.98823),
    "subway": (40.74092, -73.98353),
    "dunkin": (40.74608, -73.97937),
    "shake-shack": (40.73, -73.98981),
    "panera": (40.74769, -73.99326),
    "dominos": (40.73264, -73.99751),
    "exxon": (40.69748, -73.9329),
    "walgreens": (40.72665, -73.95229),
    "adidas": (40.72373, -74.00002),
    "zara": (40.73806, -73.99189),
    "gap": (40.74, -73.99093),
    "old-navy": (40.75743, -73.98547),
    "foot-locker": (40.72888, -73.99344),
    "urban-outfitters": (40.72988, -73.98645),
    "levis": (40.72211, -73.99978),
    "tj-maxx": (40.74012, -73.9945),
    "best-buy": (40.73431, -73.99006),
    "apple": (40.76384, -73.97296),
    "home-depot": (40.76143, -73.96689),
    "lowes": (40.6718, -73.9952),
    "ikea": (40.67145, -74.01122),
    "macys": (40.75089, -73.98926),
    "nordstrom": (40.76662, -73.98205),
    "sephora": (40.74025, -74.00612),
    "ulta": (40.77871, -73.9544),
    "barnes-and-noble": (40.75582, -73.9788),
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
