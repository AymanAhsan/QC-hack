"""POST /api/cart/parse (multipart). Owner: Nazeef.

Foundation stub: answers 501 until the Gemini parser and sample cart land.
Contract: multipart field `file` (PNG/JPEG/WEBP, <= MAX_UPLOAD_BYTES) or form
field `use_sample=true`. On Gemini failure return the labeled sample cart.
"""

from fastapi import APIRouter, File, Form, UploadFile

from errors import ApiError
from schemas import CartParseResponse

router = APIRouter(prefix="/api", tags=["cart"])


@router.post("/cart/parse", response_model=CartParseResponse)
async def parse_cart(
    file: UploadFile | None = File(default=None),
    use_sample: bool = Form(default=False),
) -> CartParseResponse:
    raise ApiError(501, "not_implemented", "Cart parsing is not available yet. Use manual entry.")
