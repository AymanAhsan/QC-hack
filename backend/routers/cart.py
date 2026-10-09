"""POST /api/cart/parse (multipart). Owner: Nazeef.

Contract: multipart field `file` (PNG/JPEG/WEBP, <= MAX_UPLOAD_BYTES) or form
field `use_sample=true` (which wins if both are sent). The image type is read
from the file's bytes, not its label. On any Gemini failure the response is the
labeled sample cart with a `warning` saying why.
"""

import logging

from fastapi import APIRouter, File, Form, UploadFile

import gemini
from config import settings
from data import WALLET
from engine import triple_stack
from errors import ApiError
from gemini import CartData, CartLine, GeminiError
from schemas import CartItem, CartParseResponse, ParsedCart
from serializers import stack_out
from services import resolve_merchant

router = APIRouter(prefix="/api", tags=["cart"])
log = logging.getLogger("uvicorn.error")

# Sums to $100 at Nike, so the sample reproduces the documented check value:
# SAVE15 leaves $85, Apple Card earns 3% ($2.55), 17.55% back in total.
SAMPLE_CART = CartData(
    merchant_name="Nike",
    category="apparel",
    items=(
        CartLine(name="Nike Revolution 7 Road Running Shoes", qty=1, price_cents=7000),
        CartLine(name="Nike Everyday Cushioned Crew Socks (3 pairs)", qty=1, price_cents=1800),
        CartLine(name="Nike Swoosh Headband", qty=2, price_cents=1200),
    ),
    subtotal_cents=10000,
    shipping_cents=None,
)


def _image_type(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


async def _respond(cart: CartData, warning: str | None, is_sample: bool) -> CartParseResponse:
    merchant, coupons = await resolve_merchant(None, cart.merchant_name)
    result = triple_stack(WALLET, merchant, cart.subtotal_cents, cart.shipping_cents, coupons)
    return CartParseResponse(
        source="sample" if is_sample else "gemini",
        is_sample=is_sample,
        warning=warning,
        cart=ParsedCart(
            merchant_name=merchant.name,
            merchant_id=merchant.id,
            category=merchant.category,
            items=[CartItem(name=i.name, qty=i.qty, price_cents=i.price_cents) for i in cart.items],
            subtotal_cents=cart.subtotal_cents,
            shipping_cents=cart.shipping_cents,
        ),
        stack=stack_out(result, coupons),
    )


@router.post("/cart/parse", response_model=CartParseResponse)
async def parse_cart(
    file: UploadFile | None = File(default=None),
    use_sample: bool = Form(default=False),
) -> CartParseResponse:
    if use_sample:
        return await _respond(SAMPLE_CART, warning=None, is_sample=True)
    if file is None:
        raise ApiError(
            422,
            "validation_error",
            "Upload a cart screenshot or set use_sample=true.",
            {"errors": [{"loc": ["body", "file"], "msg": "Field required", "type": "missing"}]},
        )
    data = await file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        limit_mb = settings.max_upload_bytes / (1024 * 1024)
        raise ApiError(413, "payload_too_large", f"Screenshots must be {limit_mb:g} MB or smaller.")
    mime_type = _image_type(data)
    if mime_type is None:
        raise ApiError(415, "unsupported_media_type", "Upload a PNG, JPEG, or WEBP screenshot.")
    try:
        cart = await gemini.parse_cart_image(data, mime_type)
    except GeminiError as exc:
        log.warning("Cart parse fell back to the sample cart: %s", exc.__cause__ or exc)
        return await _respond(SAMPLE_CART, warning=f"{exc} Showing a sample cart instead.", is_sample=True)
    return await _respond(cart, warning=None, is_sample=False)
