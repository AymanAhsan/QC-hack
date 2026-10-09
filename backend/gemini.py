"""Gemini integration: cart screenshot parsing and simulated coupon generation.

Owner: Nazeef. This foundation version defines the interface other modules call
and ships offline fallbacks only (no network calls yet):

- generate_coupon(store_name) -> SimulatedCoupon. Never raises. Cached per store.
  Real version: ask Gemini, validate the JSON, fall back to the deterministic
  coupon below on any failure. Gemini coupons use source="ai_simulated".
- parse_cart_image(data, mime_type) -> CartData. Raises GeminiUnavailable /
  GeminiError; the cart router turns that into a labeled sample cart.

The API key and model come from config.settings (GEMINI_API_KEY, GEMINI_MODEL)
and never leave the backend.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from decimal import Decimal

from data import Coupon, normalize_name


class GeminiError(Exception):
    """Gemini returned an error or output that failed validation."""


class GeminiUnavailable(GeminiError):
    """No API key configured, or the service could not be reached."""


@dataclass(frozen=True)
class SimulatedCoupon:
    coupon: Coupon
    category: str


@dataclass(frozen=True)
class CartLine:
    name: str
    qty: int
    price_cents: int


@dataclass(frozen=True)
class CartData:
    merchant_name: str
    category: str
    items: tuple[CartLine, ...]
    subtotal_cents: int
    shipping_cents: int | None


_coupon_cache: dict[str, SimulatedCoupon] = {}

_CATEGORY_HINTS = (
    ("dining", ("pizza", "burger", "cafe", "coffee", "grill", "kitchen", "taco", "sushi", "eats", "restaurant")),
    ("grocery", ("market", "grocer", "foods", "mart")),
    ("apparel", ("wear", "apparel", "fashion", "shoe", "boutique", "clothing")),
    ("hotel", ("hotel", "inn", "resort", "suites")),
    ("airfare", ("air", "airline", "airways")),
    ("gas", ("fuel", "gas", "petrol")),
    ("drugstore", ("pharmacy", "drug")),
)


def _guess_category(store_name: str) -> str:
    lowered = store_name.lower()
    for category, hints in _CATEGORY_HINTS:
        if any(h in lowered for h in hints):
            return category
    return "general"


def fallback_coupon(store_name: str) -> SimulatedCoupon:
    """Deterministic simulated coupon so the same store always gets the same code."""
    digest = int(hashlib.sha256(normalize_name(store_name).encode()).hexdigest(), 16)
    pct = (10, 12, 15, 20)[digest % 4]
    prefix = re.sub(r"[^A-Z]", "", store_name.upper())[:6] or "SAVE"
    coupon = Coupon(
        code=f"{prefix}{pct}",
        kind="percent",
        value=Decimal(pct),
        description=f"{pct}% off (simulated for the demo)",
        min_spend_cents=0,
        max_discount_cents=5000,
        source="simulated_fallback",
    )
    return SimulatedCoupon(coupon=coupon, category=_guess_category(store_name))


async def generate_coupon(store_name: str) -> SimulatedCoupon:
    key = normalize_name(store_name)
    if key not in _coupon_cache:
        _coupon_cache[key] = fallback_coupon(store_name)
    return _coupon_cache[key]


async def parse_cart_image(data: bytes, mime_type: str) -> CartData:
    raise GeminiUnavailable("Gemini cart parsing is not implemented yet.")
