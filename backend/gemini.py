"""Gemini integration: cart screenshot parsing and simulated coupon generation.

Owner: Nazeef.

- generate_coupon(store_name) -> SimulatedCoupon. Never raises. Cached per store.
  Asks Gemini for a realistic-looking code (source="ai_simulated") and falls
  back to the deterministic coupon below on any failure or when no key is set.
- parse_cart_image(data, mime_type) -> CartData. Raises GeminiUnavailable /
  GeminiError with a message fit to show the user; the cart router turns that
  into a labeled sample cart.

Gemini answers in JSON constrained by a schema, and every answer is validated
again here before use. The API key and model come from config.settings
(GEMINI_API_KEY, GEMINI_MODEL) and never leave the backend.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from dataclasses import dataclass
from decimal import Decimal

from google import genai
from google.genai import types
from pydantic import BaseModel, Field, ValidationError

from config import settings
from data import CATEGORY_LABELS, Coupon, normalize_name
from engine import round_whole

log = logging.getLogger("uvicorn.error")

# Typing a store on Scan waits for its coupon, so give up sooner than for a cart.
_COUPON_TIMEOUT_S = 8.0
_COUPON_CAP_CENTS = 5000


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
        max_discount_cents=_COUPON_CAP_CENTS,
        source="simulated_fallback",
    )
    return SimulatedCoupon(coupon=coupon, category=_guess_category(store_name))


# --------------------------------------------------------------------------- Gemini calls


def _get_client() -> genai.Client:
    """A fresh client per call: its async connections belong to the caller's event loop."""
    if not settings.gemini_api_key:
        raise GeminiUnavailable("Gemini isn't configured.")
    return genai.Client(api_key=settings.gemini_api_key)


async def _call(client: genai.Client, contents: list | str, config: types.GenerateContentConfig):
    with client:
        async with client.aio as aio:
            return await aio.models.generate_content(model=settings.gemini_model, contents=contents, config=config)


async def _generate_json(contents: list | str, schema: dict, timeout_s: float, temperature: float) -> str:
    client = _get_client()
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_json_schema=schema,
        temperature=temperature,
    )
    try:
        response = await asyncio.wait_for(_call(client, contents, config), timeout_s)
    except TimeoutError as exc:
        raise GeminiError("Gemini took too long to answer.") from exc
    except Exception as exc:  # the SDK raises APIError, httpx transport errors, and others
        raise GeminiUnavailable("Gemini couldn't be reached.") from exc
    if not response.text:
        raise GeminiError("Gemini returned an empty answer.")
    return response.text


def _cents(dollars: Decimal) -> int:
    return round_whole(dollars * 100)


def _category(value: str, store_name: str) -> str:
    return value if value in CATEGORY_LABELS else _guess_category(store_name)


# --------------------------------------------------------------------------- cart screenshots

_CART_PROMPT = """You read screenshots of online shopping carts, bags, and checkout pages.
Return JSON:
- is_cart: false if the image is not a shopping cart, bag, checkout, or order summary.
- merchant_name: the store's brand name as a shopper would say it ("Nike", not "nike.com" or "NIKE, Inc.").
- category: the store's spending category.
- items: every line item; qty is the quantity; line_total is that line's price in US dollars (quantity x unit price).
- subtotal: the item subtotal in US dollars before shipping, tax, and discounts. If none is shown, the sum of line totals.
- shipping: shipping cost in US dollars; 0 if shown as free; null if not shown or not yet calculated.
Ignore tax, tips, and totals that include tax."""

_CART_SCHEMA = {
    "type": "object",
    "properties": {
        "is_cart": {"type": "boolean"},
        "merchant_name": {"type": "string"},
        "category": {"type": "string", "enum": list(CATEGORY_LABELS)},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "qty": {"type": "integer"},
                    "line_total": {"type": "number"},
                },
                "required": ["name", "qty", "line_total"],
            },
        },
        "subtotal": {"type": "number"},
        "shipping": {"type": ["number", "null"]},
    },
    "required": ["is_cart", "merchant_name", "category", "items", "subtotal", "shipping"],
}


class _CartLineReply(BaseModel):
    name: str
    qty: int = Field(ge=1)
    line_total: Decimal = Field(ge=0)


class _CartReply(BaseModel):
    is_cart: bool
    merchant_name: str
    category: str
    items: list[_CartLineReply]
    subtotal: Decimal = Field(ge=0)
    shipping: Decimal | None = Field(ge=0)


async def parse_cart_image(data: bytes, mime_type: str) -> CartData:
    text = await _generate_json(
        [types.Part.from_bytes(data=data, mime_type=mime_type), _CART_PROMPT],
        _CART_SCHEMA,
        settings.gemini_timeout_s,
        temperature=0,
    )
    try:
        reply = _CartReply.model_validate_json(text)
    except ValidationError as exc:
        raise GeminiError("Gemini's answer didn't look like a cart.") from exc
    if not reply.is_cart:
        raise GeminiError("That image doesn't look like a shopping cart.")
    merchant_name = reply.merchant_name.strip()
    items = tuple(
        CartLine(name=i.name.strip(), qty=i.qty, price_cents=_cents(i.line_total)) for i in reply.items if i.name.strip()
    )
    if not merchant_name or not items:
        raise GeminiError("Couldn't find the store and items in that screenshot.")
    subtotal_cents = _cents(reply.subtotal) or sum(i.price_cents for i in items)
    if subtotal_cents <= 0:
        raise GeminiError("Couldn't find a subtotal in that screenshot.")
    return CartData(
        merchant_name=merchant_name,
        category=_category(reply.category, merchant_name),
        items=items,
        subtotal_cents=subtotal_cents,
        shipping_cents=None if reply.shipping is None else _cents(reply.shipping),
    )


# --------------------------------------------------------------------------- simulated coupons

_COUPON_PROMPT = """Invent one realistic-looking promo code a shopper might find for the store below, for a demo app. It is simulated, not a real offer.
Return JSON: code (4-12 uppercase letters and digits), discount_pct (whole percent, 5-25), description (under 60 characters, e.g. "15% off your order"), category (the store's spending category).
Store name: """

_COUPON_SCHEMA = {
    "type": "object",
    "properties": {
        "code": {"type": "string"},
        "discount_pct": {"type": "integer"},
        "description": {"type": "string"},
        "category": {"type": "string", "enum": list(CATEGORY_LABELS)},
    },
    "required": ["code", "discount_pct", "description", "category"],
}


class _CouponReply(BaseModel):
    code: str
    discount_pct: int
    description: str
    category: str


async def _ai_coupon(store_name: str) -> SimulatedCoupon:
    text = await _generate_json(f"{_COUPON_PROMPT}{store_name!r}", _COUPON_SCHEMA, _COUPON_TIMEOUT_S, temperature=0)
    try:
        reply = _CouponReply.model_validate_json(text)
    except ValidationError as exc:
        raise GeminiError("Gemini's coupon failed validation.") from exc
    code = re.sub(r"[^A-Z0-9]", "", reply.code.upper())[:12]
    if len(code) < 4:
        raise GeminiError(f"Gemini's coupon code {reply.code!r} is unusable.")
    pct = min(max(reply.discount_pct, 5), 25)
    coupon = Coupon(
        code=code,
        kind="percent",
        value=Decimal(pct),
        description=reply.description.strip()[:80] or f"{pct}% off",
        min_spend_cents=0,
        max_discount_cents=_COUPON_CAP_CENTS,
        source="ai_simulated",
    )
    return SimulatedCoupon(coupon=coupon, category=_category(reply.category, store_name))


async def generate_coupon(store_name: str) -> SimulatedCoupon:
    key = normalize_name(store_name)
    if key in _coupon_cache:
        return _coupon_cache[key]
    try:
        simulated = await _ai_coupon(store_name)
    except GeminiError as exc:
        log.info("Simulated coupon for %r uses the offline fallback: %s", store_name, exc.__cause__ or exc)
        simulated = fallback_coupon(store_name)
    # Concurrent requests for one store may both reach here; the first answer stays.
    return _coupon_cache.setdefault(key, simulated)
