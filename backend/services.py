"""Shared lookups used by several routers: merchant resolution and coupon sourcing."""

from __future__ import annotations

from data import Coupon, Merchant, find_merchant_by_name, get_merchant, unknown_merchant
from errors import ApiError
import gemini


async def resolve_merchant(merchant_id: str | None, merchant_name: str | None) -> tuple[Merchant, tuple[Coupon, ...]]:
    """Find a known merchant by id or name, or synthesize an unknown one with a simulated coupon.

    Returns the merchant and the coupons that apply to it. Unknown-merchant
    coupons come from gemini.generate_coupon, which caches per store name and
    always returns a coupon flagged as simulated.
    """
    if merchant_id:
        merchant = get_merchant(merchant_id)
        if merchant is not None:
            return merchant, merchant.coupons
        if not merchant_id.startswith("unknown:") or not merchant_name:
            raise ApiError(404, "merchant_not_found", f"Unknown merchant id {merchant_id!r}.")
    if not merchant_name or not merchant_name.strip():
        raise ApiError(422, "merchant_required", "Provide merchant_id or merchant_name.")
    merchant = find_merchant_by_name(merchant_name)
    if merchant is not None:
        return merchant, merchant.coupons
    simulated = await gemini.generate_coupon(merchant_name.strip())
    merchant = unknown_merchant(merchant_name, simulated.category)
    return merchant, (simulated.coupon,)
